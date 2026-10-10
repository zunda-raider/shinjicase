import type { ScorePacket } from '../logic/report'
import { scoreByRubric, type ScoreInput } from './rubricScorer'
import { letterFromTotal, reachFromTotal, type CriterionId, type ScoreResult } from './types'

function env(name: string): string {
  try {
    const v = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[name]
    return typeof v === 'string' ? v.trim() : ''
  } catch {
    return ''
  }
}

interface LlamaAdjust {
  adjust?: Partial<Record<CriterionId, number>>
  feedback?: Partial<Record<CriterionId, string>>
  comment?: string
}

export function parseModelJson(text: string): LlamaAdjust | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1)) as LlamaAdjust
  } catch {
    return null
  }
}

export function buildPrompt(packet: ScorePacket, rule: ScoreResult): string {
  return `あなたはケース面接の採点官です。ルールベース採点の結果を見直し、次のJSONだけを返してください（説明文なし）:
{"adjust":{"premise":-10..10,"decomposition":-10..10,"focus":-10..10,"measures":-10..10,"speech":-10..10,"evaluation":-10..10},"feedback":{"<id>":"日本語一行"},"comment":"日本語で2〜3文の講評"}
調整はルール結果で拾えていない質だけに限る。rubric（許容解）があれば系統・許容する分解・不可を基準にする。
ルール結果:
${JSON.stringify(rule.criteria)}
ケース:
${JSON.stringify(packet)}`
}

/** ルール結果に Llama の調整（各 ±10、0〜満点にクリップ）と講評を重ねる */
export function applyAdjust(rule: ScoreResult, adj: LlamaAdjust, model?: string): ScoreResult {
  const criteria = rule.criteria.map((c) => {
    const d = Math.max(-10, Math.min(10, Math.round(Number(adj.adjust?.[c.id]) || 0)))
    const fb = adj.feedback?.[c.id]
    return {
      ...c,
      score: Math.max(0, Math.min(c.max, c.score + d)),
      feedback: typeof fb === 'string' && fb.trim() ? fb.trim() : c.feedback,
    }
  })
  const total = criteria.reduce((a, c) => a + c.score, 0)
  return {
    ...rule,
    source: 'llama',
    model,
    criteria,
    total,
    grade: letterFromTotal(total),
    reach: reachFromTotal(total),
    comment: typeof adj.comment === 'string' && adj.comment.trim() ? adj.comment.trim() : rule.comment,
  }
}

async function viaProxy(prompt: string): Promise<{ adj: LlamaAdjust; model?: string } | null> {
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as LlamaAdjust & { error?: string; model?: string }
    if (data.error) return null
    return { adj: data, model: data.model }
  } catch {
    return null
  }
}

async function viaOpenAICompat(prompt: string): Promise<{ adj: LlamaAdjust; model?: string } | null> {
  const base = env('VITE_LLAMA_BASE_URL').replace(/\/$/, '')
  const key = env('VITE_LLAMA_API_KEY')
  const model = env('VITE_LLAMA_MODEL') || 'llama3.2'
  if (!base) return null
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'あなたは厳格なケース面接採点官。JSONのみ返す。' },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const adj = parseModelJson(data.choices?.[0]?.message?.content ?? '')
    return adj ? { adj, model } : null
  } catch {
    return null
  }
}

/** 主採点はルールベース。Llama があれば ±10 の調整と講評を重ねる。 */
export async function scoreCase(packet: ScorePacket, input: ScoreInput): Promise<ScoreResult> {
  const rule = scoreByRubric(input)
  const prompt = buildPrompt(packet, rule)
  const r = (await viaProxy(prompt)) ?? (await viaOpenAICompat(prompt))
  return r ? applyAdjust(rule, r.adj, r.model) : rule
}
