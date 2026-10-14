import type { IdealAnswer } from '../data/ideals/types'
import { formatClient, formatDefinition, formatTarget, otherPremises } from '../data/intake'
import type {
  EvidenceWorkspace,
  IntakeData,
  ReportScriptState,
  SummaryPitchCard,
  SummaryState,
  WarrantState,
} from '../types'
import { summaryMeasures } from './summary'

export {
  MAX_FEATURED,
  createPitchCard,
  createSummaryState,
  ensureDefaultCards,
  isSummaryState,
  loadSummaryState,
  pruneSummaryCards,
  seedEffect,
  seedPremises,
  seedWhere,
  setActiveCard,
  setFeaturedMeasures,
  summaryMeasures,
  updatePitchCard,
} from './summary'
export type { RankedMeasure } from './summary'

/* ------------------------------------------------------------------ */
/* ⅶ REPORT：1分発表の地続き台本                                        */
/* ------------------------------------------------------------------ */

export function createReportScript(): ReportScriptState {
  return { version: 1, text: '' }
}

export function isReportScript(v: unknown): v is ReportScriptState {
  if (!v || typeof v !== 'object') return false
  const r = v as Partial<ReportScriptState>
  return r.version === 1 && typeof r.text === 'string'
}

export function loadReportScript(v: unknown): ReportScriptState {
  if (isReportScript(v)) return { ...v }
  return createReportScript()
}

/** SUMMARY カード内容の指紋（並び・本文） */
export function summaryFingerprint(cards: SummaryPitchCard[]): string {
  return cards
    .map((c) =>
      [c.measureKey, c.premiseDefinition, c.premiseClient, c.premiseTarget, c.current, c.goal, c.where, c.effect].join('\x1f'),
    )
    .join('\x1e')
}

function sentence(s: string): string {
  const t = s.trim().replace(/[。．.\s]+$/u, '')
  return t ? `${t}。` : ''
}

/** SUMMARY の各欄を自然な日本語の通し台本にする */
export function draftReportScript(cards: SummaryPitchCard[], intake: IntakeData): string {
  if (!cards.length) return ''
  const target = formatTarget(intake.target)
  const opener = `本日は、${target}に向けた打ち手についてご説明します。`
  const blocks = cards.map((c, i) => {
    const lead = i === 0 ? 'まず' : 'あわせて'
    const premiseBits = [c.premiseDefinition, c.premiseClient, c.premiseTarget].map((x) => x.trim()).filter(Boolean)
    const premise = premiseBits.length ? `前提として、${premiseBits.join('／')}。` : ''
    const current = c.current.trim() ? `現状は、${sentence(c.current).replace(/。$/, '').trim()}。` : ''
    const goal = c.goal.trim() ? `ゴールは、${sentence(c.goal).replace(/。$/, '').trim()}。` : ''
    const where = c.where.trim()
    const effect = c.effect.trim()
    let measure = ''
    if (where && effect) measure = `施策は「${where}」で、${sentence(effect)}`
    else if (where) measure = `施策は「${where}」です。`
    else if (effect) measure = sentence(effect)
    return [lead + '、' + premise, current, goal, measure].filter(Boolean).join('')
  })
  return [opener, ...blocks].join('\n\n')
}

/** SUMMARY から自動下書き。手動編集後は触らない。カード変更で fingerprint が変わると再生成。 */
export function ensureReportScript(
  script: ReportScriptState,
  cards: SummaryPitchCard[],
  intake: IntakeData,
): ReportScriptState {
  const fp = summaryFingerprint(cards)
  if (script.manual && script.text.trim()) return script
  if (script.from === fp && script.text.trim()) return script
  const text = draftReportScript(cards, intake)
  if (text === script.text && script.from === fp) return script
  return { version: 1, text, from: fp, manual: false }
}

export function setReportScriptText(_prev: ReportScriptState, text: string, cards: SummaryPitchCard[]): ReportScriptState {
  return { version: 1, text, from: summaryFingerprint(cards), manual: true }
}

/* ------------------------------------------------------------------ */
/* Llama パケット                                                      */
/* ------------------------------------------------------------------ */

export interface ScorePacket {
  intake: {
    definition: string
    client: string
    target: string
    premises: { label: string; value: string }[]
  }
  sheets: { id: string; name: string; formula: string }[]
  suspects: { path: string; motive: string }[]
  pitches: {
    tab: number
    key: string
    measureLabel: string
    premiseDefinition: string
    premiseClient: string
    premiseTarget: string
    current: string
    goal: string
    where: string
    effect: string
    role: string
    reason: string
    rank: number | null
  }[]
  allMeasures: {
    key: string
    sheet: string
    path: string
    text: string
    role: string
    reason: string
    rank: number
  }[]
  /** 1分発表の通し台本 */
  script: string
  warrantFinalAnswer: string
  rubric?: IdealAnswer
}

export function buildScorePacket(args: {
  intake: IntakeData
  ws: EvidenceWorkspace
  pins: string[]
  motives: Record<string, string>
  warrant: WarrantState
  summary: SummaryState
  script: ReportScriptState
  rubric?: IdealAnswer | null
}): ScorePacket {
  const { intake, ws, pins, motives, warrant, summary, script, rubric } = args
  const measures = summaryMeasures(ws, pins, warrant)
  const byKey = new Map(measures.map((m) => [m.key, m]))

  const sheets = ws.sheets.map((s) => {
    const root = s.tree.nodes[s.tree.rootId]
    const kids = root?.children ?? []
    const op = root?.split ? (root.split.kind === 'mul' ? ' × ' : ' ＋ ') : ''
    const formula =
      kids.length === 0
        ? root?.label ?? ''
        : kids.map((id) => s.tree.nodes[id]?.label ?? '？').join(op)
    return { id: s.id, name: s.name, formula: `${root?.label ?? ''} = ${formula}` }
  })

  const seen = new Set<string>()
  const uniqueSuspects: { path: string; motive: string }[] = []
  for (const key of pins) {
    const hit = measures.find((m) => `${m.sheetId}/${m.nodeId}` === key)
    const path = hit ? `${hit.number} ${hit.nodeLabel}（${hit.sheetName}）` : key
    if (seen.has(path)) continue
    seen.add(path)
    uniqueSuspects.push({ path, motive: motives[key] ?? '' })
  }

  return {
    intake: {
      definition: formatDefinition(intake),
      client: formatClient(intake),
      target: formatTarget(intake.target),
      premises: otherPremises(intake),
    },
    sheets,
    suspects: uniqueSuspects,
    pitches: summary.cards.map((c, i) => {
      const m = byKey.get(c.measureKey)
      return {
        tab: i + 1,
        key: c.measureKey,
        measureLabel: m?.text ?? c.measureKey,
        premiseDefinition: c.premiseDefinition,
        premiseClient: c.premiseClient,
        premiseTarget: c.premiseTarget,
        current: c.current,
        goal: c.goal,
        where: c.where,
        effect: c.effect,
        role: m?.role ?? '',
        reason: m?.reason ?? '',
        rank: m?.rank ?? null,
      }
    }),
    allMeasures: measures.map((m) => ({
      key: m.key,
      sheet: m.sheetName,
      path: `${m.number} ${m.nodeLabel}`,
      text: m.text,
      role: m.role,
      reason: m.reason,
      rank: m.rank,
    })),
    script: script.text,
    warrantFinalAnswer: warrant.finalAnswer,
    ...(rubric ? { rubric } : {}),
  }
}

