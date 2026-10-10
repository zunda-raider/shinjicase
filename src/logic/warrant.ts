import type {
  AxisId,
  EvalAxis,
  EvidenceWorkspace,
  Grade,
  MeasureKey,
  Ratings,
  WarrantState,
} from '../types'
import { numberTree } from './evidenceTree'
import { isPinValid } from './workspace'

export const MIN_AXES = 2
export const MAX_AXES = 3

export const GRADE_LABEL: Record<Grade, string> = {
  circle: '○',
  triangle: '△',
  cross: '✖',
}
export const GRADE_SCORE: Record<Grade, number> = {
  circle: 2,
  triangle: 1,
  cross: 0,
}
export const GRADES: Grade[] = ['circle', 'triangle', 'cross']

/** 編集可能な初期軸（プレイヤーが名前を変えられる／削れる） */
export const DEFAULT_AXIS_NAMES = ['効果', '実行しやすさ', '期間'] as const

export function createWarrantState(): WarrantState {
  return {
    version: 1,
    axisSeq: DEFAULT_AXIS_NAMES.length,
    axes: DEFAULT_AXIS_NAMES.map((name, i) => ({ id: `a${i + 1}`, name })),
    ratings: {},
    finalAnswer: '',
  }
}

export function measureKey(sheetId: string, nodeId: string, measureId: string): MeasureKey {
  return `${sheetId}/${nodeId}/${measureId}`
}

export function parseMeasureKey(key: MeasureKey): {
  sheetId: string
  nodeId: string
  measureId: string
} {
  const i = key.indexOf('/')
  const j = key.indexOf('/', i + 1)
  return {
    sheetId: key.slice(0, i),
    nodeId: key.slice(i + 1, j),
    measureId: key.slice(j + 1),
  }
}

/* ------------------------------------------------------------------ */
/* 評価軸                                                              */
/* ------------------------------------------------------------------ */

export function addAxis(state: WarrantState, name = ''): WarrantState {
  if (state.axes.length >= MAX_AXES) return state
  const axisSeq = state.axisSeq + 1
  return {
    ...state,
    axisSeq,
    axes: [...state.axes, { id: `a${axisSeq}`, name }],
  }
}

export function renameAxis(state: WarrantState, id: AxisId, name: string): WarrantState {
  if (!state.axes.some((a) => a.id === id)) return state
  return {
    ...state,
    axes: state.axes.map((a) => (a.id === id ? { ...a, name } : a)),
  }
}

/** 軸を削除（最低 MIN_AXES 本は残す）。その軸の評点も捨てる。 */
export function removeAxis(state: WarrantState, id: AxisId): WarrantState {
  if (state.axes.length <= MIN_AXES) return state
  if (!state.axes.some((a) => a.id === id)) return state
  const ratings: Ratings = {}
  for (const [mk, row] of Object.entries(state.ratings)) {
    const next = { ...row }
    delete next[id]
    if (Object.keys(next).length) ratings[mk] = next
  }
  return { ...state, axes: state.axes.filter((a) => a.id !== id), ratings }
}

export function namedAxes(state: WarrantState): EvalAxis[] {
  return state.axes.filter((a) => a.name.trim() !== '')
}

/* ------------------------------------------------------------------ */
/* 評点                                                                */
/* ------------------------------------------------------------------ */

/** 同じ評点をもう一度押すと外す（トグル） */
export function setRating(
  state: WarrantState,
  key: MeasureKey,
  axisId: AxisId,
  grade: Grade,
): WarrantState {
  if (!state.axes.some((a) => a.id === axisId)) return state
  const row = { ...(state.ratings[key] ?? {}) }
  if (row[axisId] === grade) delete row[axisId]
  else row[axisId] = grade
  const ratings = { ...state.ratings }
  if (Object.keys(row).length) ratings[key] = row
  else delete ratings[key]
  return { ...state, ratings }
}

export function clearRating(state: WarrantState, key: MeasureKey, axisId: AxisId): WarrantState {
  const row = state.ratings[key]
  if (!row?.[axisId]) return state
  const next = { ...row }
  delete next[axisId]
  const ratings = { ...state.ratings }
  if (Object.keys(next).length) ratings[key] = next
  else delete ratings[key]
  return { ...state, ratings }
}

export function setFinalAnswer(state: WarrantState, text: string): WarrantState {
  return { ...state, finalAnswer: text }
}

/* ------------------------------------------------------------------ */
/* OPERATION から施策を集める                                          */
/* ------------------------------------------------------------------ */

export interface WarrantMeasure {
  key: MeasureKey
  sheetId: string
  sheetName: string
  nodeId: string
  number: string
  nodeLabel: string
  measureId: string
  text: string
  /** そのノードが容疑者（赤ピン）かどうか */
  pinned: boolean
  pinNo?: number
}

/** 中身のある施策だけ。容疑者の施策を先に、あとはツリー順。 */
export function collectMeasures(
  ws: EvidenceWorkspace,
  pins: string[],
): WarrantMeasure[] {
  const pinIndex = new Map<string, number>()
  pins.filter((k) => isPinValid(ws, k)).forEach((k, i) => pinIndex.set(k, i + 1))

  type Row = WarrantMeasure & { _ord: number }
  const out: Row[] = []
  let ord = 0
  for (const sheet of ws.sheets) {
    const nums = numberTree(sheet.tree)
    // ノードはツリー順、施策は配列の順のまま
    const nodeIds = Object.keys(sheet.tree.nodes)
    for (const nodeId of nodeIds) {
      const list = sheet.measures[nodeId]
      if (!list) continue
      const node = sheet.tree.nodes[nodeId]
      if (!node) continue
      const pinKey = `${sheet.id}/${nodeId}`
      const pinNo = pinIndex.get(pinKey)
      for (const m of list) {
        if (!m.text.trim()) continue
        out.push({
          key: measureKey(sheet.id, nodeId, m.id),
          sheetId: sheet.id,
          sheetName: sheet.name,
          nodeId,
          number: nums[nodeId] ?? '',
          nodeLabel: node.label.trim() || '（未記入）',
          measureId: m.id,
          text: m.text.trim(),
          pinned: pinNo !== undefined,
          pinNo,
          _ord: ord++,
        })
      }
    }
  }
  out.sort((a, b) => {
    const pa = a.pinNo ?? Infinity
    const pb = b.pinNo ?? Infinity
    if (pa !== pb) return pa - pb
    if (a.sheetId !== b.sheetId) {
      return (
        ws.sheets.findIndex((s) => s.id === a.sheetId) -
        ws.sheets.findIndex((s) => s.id === b.sheetId)
      )
    }
    // 同じ切り口・同じ容疑者内は追加順を保つ（番号→追加順）
    const num = a.number.localeCompare(b.number, undefined, { numeric: true })
    if (num !== 0) return num
    return a._ord - b._ord
  })
  return out.map(({ _ord, ...rest }) => rest)
}

/** OPERATION に残っている施策だけ／存在しない軸の評点を捨てる */
export function pruneWarrant(
  state: WarrantState,
  ws: EvidenceWorkspace,
): WarrantState {
  const validKeys = new Set(collectMeasures(ws, []).map((m) => m.key))
  // ピンに関係なく、存在する施策のキーだけ残す
  const axisIds = new Set(state.axes.map((a) => a.id))
  let changed = false
  const ratings: Ratings = {}
  for (const [mk, row] of Object.entries(state.ratings)) {
    if (!validKeys.has(mk)) {
      changed = true
      continue
    }
    const next: Partial<Record<AxisId, Grade>> = {}
    for (const [aid, g] of Object.entries(row)) {
      if (axisIds.has(aid) && g) next[aid] = g as Grade
      else changed = true
    }
    if (Object.keys(next).length) ratings[mk] = next
    else if (Object.keys(row).length) changed = true
  }
  return changed ? { ...state, ratings } : state
}

/* ------------------------------------------------------------------ */
/* 採点・順位                                                          */
/* ------------------------------------------------------------------ */

export function measureScore(
  state: WarrantState,
  key: MeasureKey,
  axes: EvalAxis[] = namedAxes(state),
): number | null {
  const row = state.ratings[key]
  if (!row) return null
  let sum = 0
  let n = 0
  for (const a of axes) {
    const g = row[a.id]
    if (!g) return null // 未評価の軸がある → 完全スコアなし
    sum += GRADE_SCORE[g]
    n++
  }
  return n === 0 ? null : sum
}

export interface RankedMeasure extends WarrantMeasure {
  score: number | null
  /** 1始まり。同点は元の順を保つ */
  rank: number
  grades: Partial<Record<AxisId, Grade>>
}

/** ○=2 △=1 ✖=0 の合計で並べる。未完了は末尾。同点は入力順を保つ。 */
export function rankMeasures(
  state: WarrantState,
  measures: WarrantMeasure[],
): RankedMeasure[] {
  const axes = namedAxes(state)
  const scored = measures.map((m, i) => ({
    ...m,
    score: measureScore(state, m.key, axes),
    grades: state.ratings[m.key] ?? {},
    _i: i,
  }))
  scored.sort((a, b) => {
    if (a.score === null && b.score === null) return a._i - b._i
    if (a.score === null) return 1
    if (b.score === null) return -1
    if (b.score !== a.score) return b.score - a.score
    return a._i - b._i
  })
  return scored.map(({ _i, ...rest }, i) => ({ ...rest, rank: i + 1 }))
}

export function isFullyRated(
  state: WarrantState,
  key: MeasureKey,
  axes: EvalAxis[] = namedAxes(state),
): boolean {
  if (axes.length === 0) return false
  const row = state.ratings[key]
  return axes.every((a) => !!row?.[a.id])
}

/* ------------------------------------------------------------------ */
/* CAPTAIN                                                             */
/* ------------------------------------------------------------------ */

export function warrantCaptainLines(
  state: WarrantState,
  measures: WarrantMeasure[],
): string[] {
  const named = namedAxes(state)
  if (state.axes.length < MIN_AXES) {
    return [
      `CAPTAIN「評価軸は最低 ${MIN_AXES} 本だ。軸を追加しろ。」`,
      'CAPTAIN「自分で軸を立てられない捜査官に、令状は出せない。」',
    ]
  }
  const unnamed = state.axes.filter((a) => !a.name.trim())
  if (unnamed.length > 0) {
    return [
      'CAPTAIN「軸の名前が空だ。効果・実行しやすさ・期間でも、自分の言葉でもいい。」',
      'CAPTAIN「軸に名前をつけてから評点をつけろ。」',
    ]
  }
  if (measures.length === 0) {
    return [
      'CAPTAIN「評点する施策がない。OPERATION に戻って作戦を書け。」',
      'CAPTAIN「空の令状は承認できない。」',
    ]
  }
  const unrated = measures.filter((m) => !isFullyRated(state, m.key, named))
  if (unrated.length > 0) {
    const sample = unrated.slice(0, 2).map((m) => `「${m.text}」`).join('・')
    return [
      `CAPTAIN「未評価の施策が ${unrated.length} 件ある。例：${sample}」`,
      'CAPTAIN「○△✖ をすべての軸について選べ。それから再提出だ。」',
    ]
  }
  const ranked = rankMeasures(state, measures)
  const top = ranked[0]
  return [
    `CAPTAIN「全施策を評価済みだ。1位は『${top.text}』（合計 ${top.score}）。」`,
    'CAPTAIN「最終回答を3行で書いておけ。令状を承認できる。」',
  ]
}

/* ------------------------------------------------------------------ */
/* 保存                                                                */
/* ------------------------------------------------------------------ */

function isGrade(v: unknown): v is Grade {
  return v === 'circle' || v === 'triangle' || v === 'cross'
}

export function isWarrantState(v: unknown): v is WarrantState {
  if (!v || typeof v !== 'object') return false
  const w = v as Partial<WarrantState>
  if (w.version !== 1 || typeof w.axisSeq !== 'number' || typeof w.finalAnswer !== 'string') {
    return false
  }
  if (!Array.isArray(w.axes) || !w.ratings || typeof w.ratings !== 'object') return false
  if (!w.axes.every((a) => a && typeof a.id === 'string' && typeof a.name === 'string')) {
    return false
  }
  return Object.values(w.ratings).every(
    (row) =>
      row &&
      typeof row === 'object' &&
      Object.values(row).every((g) => g === undefined || isGrade(g)),
  )
}

/** 旧データや壊れたデータは捨てて新規。軸が0本ならデフォルトを入れる。 */
export function loadWarrantState(v: unknown): WarrantState {
  if (!isWarrantState(v)) return createWarrantState()
  if (v.axes.length === 0) return { ...v, ...createWarrantState(), finalAnswer: v.finalAnswer }
  return v
}

