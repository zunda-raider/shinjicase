import { formatTarget } from '../data/intake'
import type {
  EvidenceWorkspace,
  IntakeData,
  ReportPitchCard,
  ReportState,
  WarrantState,
} from '../types'
import {
  GRADE_LABEL,
  collectMeasures,
  namedAxes,
  rankMeasures,
  type RankedMeasure,
} from './warrant'

export const MAX_FEATURED = 2

export function seedPremises(intake: IntakeData) {
  return {
    premiseDefinition: `${intake.definition.term}＝${intake.definition.meaning}`,
    premiseClient: `${intake.client.name}（${intake.client.role}）`,
    premiseTarget: formatTarget(intake.target),
    goal: formatTarget(intake.target),
  }
}

export function seedWhere(m: RankedMeasure): string {
  return `${m.number} ${m.nodeLabel}（切り口：${m.sheetName}）`
}

export function seedEffect(m: RankedMeasure): string {
  return `${m.text}により、「${m.nodeLabel}」を押し上げる。`
}

export function createPitchCard(
  m: RankedMeasure,
  intake: IntakeData,
  current = '',
): ReportPitchCard {
  const p = seedPremises(intake)
  return {
    measureKey: m.key,
    premiseDefinition: p.premiseDefinition,
    premiseClient: p.premiseClient,
    premiseTarget: p.premiseTarget,
    current,
    goal: p.goal,
    where: seedWhere(m),
    effect: seedEffect(m),
  }
}

export function createReportState(): ReportState {
  return { version: 3, cards: [], activeIndex: 0 }
}

function isCard(v: unknown): v is ReportPitchCard {
  if (!v || typeof v !== 'object') return false
  const c = v as Partial<ReportPitchCard>
  return (
    typeof c.measureKey === 'string' &&
    typeof c.premiseDefinition === 'string' &&
    typeof c.premiseClient === 'string' &&
    typeof c.premiseTarget === 'string' &&
    typeof c.current === 'string' &&
    typeof c.goal === 'string' &&
    typeof c.where === 'string' &&
    typeof c.effect === 'string'
  )
}

export function isReportState(v: unknown): v is ReportState {
  if (!v || typeof v !== 'object') return false
  const r = v as Partial<ReportState>
  if (r.version !== 3 || !Array.isArray(r.cards) || typeof r.activeIndex !== 'number') {
    return false
  }
  if (r.cards.length > MAX_FEATURED) return false
  return r.cards.every(isCard)
}

export function loadReportState(v: unknown): ReportState {
  if (isReportState(v)) {
    const activeIndex = Math.min(rSafe(v.activeIndex), Math.max(0, v.cards.length - 1))
    return { ...v, activeIndex }
  }
  return createReportState()
}

function rSafe(n: number) {
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
}

/** WARRANT の順位付き施策。評点済みがなければ全施策。 */
export function reportMeasures(
  ws: EvidenceWorkspace,
  pins: string[],
  warrant: WarrantState,
): RankedMeasure[] {
  const all = collectMeasures(ws, pins)
  const ranked = rankMeasures(warrant, all)
  const rated = ranked.filter((m) => m.score !== null)
  return rated.length > 0 ? rated : ranked
}

/** 消えた施策のカードを外し、activeIndex を直す */
export function pruneReportCards(
  report: ReportState,
  measures: RankedMeasure[],
): ReportState {
  const keys = new Set(measures.map((m) => m.key))
  const cards = report.cards.filter((c) => keys.has(c.measureKey))
  if (cards.length === report.cards.length) return report
  const activeIndex = Math.min(report.activeIndex, Math.max(0, cards.length - 1))
  return { ...report, cards, activeIndex }
}

/**
 * カードが0枚で候補があるとき、上位最大2件を仮置きで入れる。
 * 既にカードがある場合は触らない（ユーザー選択を尊重）。
 */
export function ensureDefaultCards(
  report: ReportState,
  measures: RankedMeasure[],
  intake: IntakeData,
): ReportState {
  if (measures.length === 0) return report
  if (report.manual && report.cards.length > 0) return report
  const top = measures.slice(0, MAX_FEATURED).map((m) => m.key)
  const cur = report.cards.map((c) => c.measureKey)
  if (top.length === cur.length && top.every((k, i) => k === cur[i])) return report
  return setFeaturedMeasures(report, top, measures, intake)
}

export function setActiveCard(report: ReportState, activeIndex: number): ReportState {
  if (report.cards.length === 0) return { ...report, activeIndex: 0 }
  const i = Math.max(0, Math.min(activeIndex, report.cards.length - 1))
  return { ...report, activeIndex: i }
}

/** カード一覧を WARRANT 順の選択キーで置き換える（最大2）。既存カードの編集はキーが同じなら引き継ぐ。 */
export function setFeaturedMeasures(
  report: ReportState,
  keys: string[],
  measures: RankedMeasure[],
  intake: IntakeData,
): ReportState {
  const uniq: string[] = []
  for (const k of keys) {
    if (!uniq.includes(k) && measures.some((m) => m.key === k)) uniq.push(k)
    if (uniq.length >= MAX_FEATURED) break
  }
  const prevByKey = new Map(report.cards.map((c) => [c.measureKey, c]))
  const cards = uniq.map((k) => {
    const prev = prevByKey.get(k)
    if (prev) return prev
    return createPitchCard(measures.find((m) => m.key === k)!, intake)
  })
  const activeIndex = Math.min(report.activeIndex, Math.max(0, cards.length - 1))
  return { ...report, cards, activeIndex }
}

export function updatePitchCard(
  report: ReportState,
  index: number,
  patch: Partial<Omit<ReportPitchCard, 'measureKey'>>,
): ReportState {
  if (index < 0 || index >= report.cards.length) return report
  const cards = report.cards.map((c, i) => (i === index ? { ...c, ...patch } : c))
  return { ...report, cards }
}

/* ------------------------------------------------------------------ */
/* Llama パケット                                                      */
/* ------------------------------------------------------------------ */

export interface ScorePacket {
  intake: { definition: string; client: string; target: string }
  sheets: { id: string; name: string; formula: string }[]
  suspects: { path: string; motive: string }[]
  axes: string[]
  /** 1分台本（施策タブごと） */
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
    grades: Record<string, string>
    score: number | null
    rank: number | null
  }[]
  allMeasures: {
    key: string
    sheet: string
    path: string
    text: string
    grades: Record<string, string>
    score: number | null
    rank: number
  }[]
  warrantFinalAnswer: string
}

export function buildScorePacket(args: {
  intake: IntakeData
  ws: EvidenceWorkspace
  pins: string[]
  motives: Record<string, string>
  warrant: WarrantState
  report: ReportState
}): ScorePacket {
  const { intake, ws, pins, motives, warrant, report } = args
  const axes = namedAxes(warrant)
  const measures = reportMeasures(ws, pins, warrant)
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

  const gradeMap = (m: RankedMeasure | undefined) => {
    const grades: Record<string, string> = {}
    if (!m) return grades
    for (const a of axes) {
      const g = m.grades[a.id]
      if (g) grades[a.name.trim() || a.id] = GRADE_LABEL[g]
    }
    return grades
  }

  return {
    intake: {
      definition: `${intake.definition.term}＝${intake.definition.meaning}`,
      client: `${intake.client.name}（${intake.client.role}）`,
      target: formatTarget(intake.target),
    },
    sheets,
    suspects: uniqueSuspects,
    axes: axes.map((a) => a.name.trim()),
    pitches: report.cards.map((c, i) => {
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
        grades: gradeMap(m),
        score: m?.score ?? null,
        rank: m?.rank ?? null,
      }
    }),
    allMeasures: measures.map((m) => ({
      key: m.key,
      sheet: m.sheetName,
      path: `${m.number} ${m.nodeLabel}`,
      text: m.text,
      grades: gradeMap(m),
      score: m.score,
      rank: m.rank,
    })),
    warrantFinalAnswer: warrant.finalAnswer,
  }
}
