import type { ScorePacket } from '../logic/report'
import { scoreOffline } from './offlineScorer'
import { clamp, letterFromTotal, type ScoreResult } from './types'

const BREAKDOWN_KEYS = ['structure', 'bottleneck', 'measures', 'evaluation'] as const

function env(name: string): string {
  try {
    // Vite クライアント
    const v = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[name]
    return typeof v === 'string' ? v.trim() : ''
  } catch {
    return ''
  }
}

function parseModelJson(text: string): Partial<ScoreResult> | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1)) as Partial<ScoreResult>
  } catch {
    return null
  }
}

function normalize(raw: Partial<ScoreResult>, source: 'llama', model?: string): ScoreResult | null {
  const b = raw.breakdown
  if (!b || typeof raw.total !== 'number' || typeof raw.comment !== 'string') return null
  const breakdown = {
    structure: clamp(Number(b.structure) || 0),
    bottleneck: clamp(Number(b.bottleneck) || 0),
    measures: clamp(Number(b.measures) || 0),
    evaluation: clamp(Number(b.evaluation) || 0),
  }
  for (const k of BREAKDOWN_KEYS) {
    if (typeof breakdown[k] !== 'number') return null
  }
  let total = Math.round(raw.total)
  if (Number.isNaN(total)) {
    total = breakdown.structure + breakdown.bottleneck + breakdown.measures + breakdown.evaluation
  }
  total = Math.max(0, Math.min(100, total))
  return {
    source,
    model,
    total,
    grade: raw.grade && 'SABCD'.includes(raw.grade) ? (raw.grade as ScoreResult['grade']) : letterFromTotal(total),
    breakdown,
    comment: raw.comment.trim() || '（講評なし）',
  }
}

function buildPrompt(packet: ScorePacket): string {
  return `あなたはケース面接の採点官です。次のJSONケースを採点し、必ず次のJSONだけを返してください（前後に説明文を付けない）:
{"total":0-100の整数,"grade":"S|A|B|C|D","breakdown":{"structure":0-25,"bottleneck":0-25,"measures":0-25,"evaluation":0-25},"comment":"日本語で2〜4文の講評"}

採点観点:
- structure: ロジックツリー／切り口の分解の妥当性
- bottleneck: 容疑者（ボトルネック）選定と動機
- measures: 打ち手がツリーに紐づいているか、最終報告の「向上」「問題点」の質
- evaluation: 評価軸と○△✖の一貫性
${packet.rubric ? `
模範解答の許容条件（rubric）がある。requiredElements の合格ライン、acceptedFirstDecompositions、hotSpots（いずれかの系統に沿っているか）、rejected（不可）を基準に厳しめに採点し、講評で系統への一致・不足を指摘すること。
` : ''}
ケース:
${JSON.stringify(packet, null, 2)}`
}

async function scoreViaProxy(packet: ScorePacket): Promise<ScoreResult | null> {
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packet),
    })
    if (!res.ok) return null
    const data = (await res.json()) as ScoreResult & { error?: string }
    if (data.error || data.source !== 'llama') return null
    return normalize(data, 'llama', data.model) ?? data
  } catch {
    return null
  }
}

async function scoreViaOpenAICompat(packet: ScorePacket): Promise<ScoreResult | null> {
  const base = env('VITE_LLAMA_BASE_URL').replace(/\/$/, '')
  const key = env('VITE_LLAMA_API_KEY')
  const model = env('VITE_LLAMA_MODEL') || 'llama3.2'
  if (!base) return null
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'あなたは厳格なケース面接採点官。JSONのみ返す。' },
          { role: 'user', content: buildPrompt(packet) },
        ],
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = data.choices?.[0]?.message?.content ?? ''
    const parsed = parseModelJson(content)
    return parsed ? normalize(parsed, 'llama', model) : null
  } catch {
    return null
  }
}

/**
 * Llama 採点を試み、だめならオフライン採点に落ちる。
 * 優先順位: Vite プロキシ(/api/score → ollama 等) → VITE_LLAMA_* → オフライン
 */
export async function scoreCase(packet: ScorePacket): Promise<ScoreResult> {
  const viaProxy = await scoreViaProxy(packet)
  if (viaProxy) return viaProxy
  const viaEnv = await scoreViaOpenAICompat(packet)
  if (viaEnv) return viaEnv
  return scoreOffline(packet)
}

export { buildPrompt, parseModelJson, normalize }
