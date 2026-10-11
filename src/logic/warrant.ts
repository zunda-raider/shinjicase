import type { EvidenceWorkspace, MeasureKey, WarrantRole, WarrantState } from '../types'
import { numberTree } from './evidenceTree'
import { isPinValid } from './workspace'

/*
 * ⅴ WARRANT：なぜその施策を選んだか。施策ごとに メイン/サブ/— と理由。
 */

export const ROLE_LABEL: Record<WarrantRole, string> = { main: 'メイン', sub: 'サブ', '': '—' }

export function createWarrantState(): WarrantState {
  return { version: 2, roles: {}, reasons: {}, finalAnswer: '' }
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

/** 位置づけを変える。メインは1つだけ（別の施策をメインにすると前のメインはサブへ） */
export function setRole(state: WarrantState, key: MeasureKey, role: WarrantRole): WarrantState {
  const roles: Record<MeasureKey, WarrantRole> = {}
  for (const [k, r] of Object.entries(state.roles)) {
    if (k === key) continue
    roles[k] = role === 'main' && r === 'main' ? 'sub' : r
  }
  if (role) roles[key] = role
  return { ...state, roles }
}

export function setReason(state: WarrantState, key: MeasureKey, text: string): WarrantState {
  return { ...state, reasons: { ...state.reasons, [key]: text } }
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

/** OPERATION に残っている施策だけ残す */
export function pruneWarrant(state: WarrantState, ws: EvidenceWorkspace): WarrantState {
  const valid = new Set(collectMeasures(ws, []).map((m) => m.key))
  const keep = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).filter(([k]) => valid.has(k)))
  const roles = keep(state.roles)
  const reasons = keep(state.reasons)
  if (Object.keys(roles).length === Object.keys(state.roles).length && Object.keys(reasons).length === Object.keys(state.reasons).length) return state
  return { ...state, roles, reasons }
}

/* ------------------------------------------------------------------ */
/* 並び（REPORT のタブ順）                                              */
/* ------------------------------------------------------------------ */

export interface RankedMeasure extends WarrantMeasure {
  role: WarrantRole
  reason: string
  /** 1始まり：メイン → サブ → その他（OPERATION の順） */
  rank: number
}

const ROLE_ORDER: Record<WarrantRole, number> = { main: 0, sub: 1, '': 2 }

export function rankMeasures(state: WarrantState, measures: WarrantMeasure[]): RankedMeasure[] {
  return measures
    .map((m, i) => ({ ...m, role: state.roles[m.key] ?? '', reason: state.reasons[m.key] ?? '', _i: i }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a._i - b._i)
    .map(({ _i, ...rest }, i) => {
      void _i
      return { ...rest, rank: i + 1 }
    })
}

/** メインが決まっていて、その理由が書けているか */
export function isWarrantDone(state: WarrantState, measures: WarrantMeasure[]): boolean {
  const main = measures.find((m) => state.roles[m.key] === 'main')
  return !!main && (state.reasons[main.key] ?? '').trim().length > 0
}

/* ------------------------------------------------------------------ */
/* 保存                                                                */
/* ------------------------------------------------------------------ */

export function isWarrantState(v: unknown): v is WarrantState {
  if (!v || typeof v !== 'object') return false
  const w = v as Partial<WarrantState>
  return w.version === 2 && !!w.roles && typeof w.roles === 'object' && !!w.reasons && typeof w.reasons === 'object'
}

/** 旧データ（評価軸・○△✖）は捨てて新規。壊れたデータも新規。 */
export function loadWarrantState(v: unknown): WarrantState {
  if (isWarrantState(v)) return { ...createWarrantState(), ...v }
  const old = v as { finalAnswer?: unknown } | null
  return { ...createWarrantState(), finalAnswer: typeof old?.finalAnswer === 'string' ? old.finalAnswer : '' }
}
