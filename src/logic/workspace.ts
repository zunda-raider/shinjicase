import type {
  Candidate,
  EvidenceNodeId,
  EvidenceSheet,
  EvidenceTree,
  EvidenceWorkspace,
  Measure,
  SheetId,
} from '../types'
import {
  MAX_PINS,
  ROOT_ID,
  canPin,
  createTree,
  decompose,
  exampleTree,
  isEvidenceTree,
  treeToCandidates,
} from './evidenceTree'

/*
 * 同じ指標（売上）に対して考えられる複数のツリー＝「切り口」をシートで持つ。
 * どのシートもルートは ⅰ INTAKE の指標（黒カード・編集不可）。
 * 赤ピンは全シート合計で最大 MAX_PINS。ピンのキーは "シートID/ノードID"。
 */

export const DEFAULT_SHEET_PREFIX = '切り口'

function sheetName(n: number) {
  return `${DEFAULT_SHEET_PREFIX}${n}`
}

export function newSheet(id: SheetId, name: string, tree: EvidenceTree): EvidenceSheet {
  return { id, name, tree, measures: {}, measureSeq: 0 }
}

export function createWorkspace(metric: string): EvidenceWorkspace {
  return {
    version: 4,
    seq: 1,
    activeSheetId: 's1',
    sheets: [newSheet('s1', sheetName(1), createTree(metric))],
  }
}

/** 例：切り口1 = 顧客数 × 客単価（顧客数 = 既存顧客 ＋ 新規顧客）、切り口2 = 店舗数 × 店舗あたり売上 */
export function exampleWorkspace(metric: string): EvidenceWorkspace {
  const t2 = decompose(createTree(metric), ROOT_ID, 'mul', ['店舗数', '店舗あたり売上']).tree
  return {
    version: 4,
    seq: 2,
    activeSheetId: 's1',
    sheets: [
      newSheet('s1', '顧客数×単価', exampleTree(metric)),
      newSheet('s2', '店舗数×店舗あたり売上', t2),
    ],
  }
}

export function activeSheet(ws: EvidenceWorkspace): EvidenceSheet {
  return ws.sheets.find((s) => s.id === ws.activeSheetId) ?? ws.sheets[0]
}

/** 新しい切り口（ルートだけのシート）を追加して選択する */
export function addSheet(ws: EvidenceWorkspace, metric: string): EvidenceWorkspace {
  const seq = ws.seq + 1
  const id = `s${seq}`
  const used = new Set(ws.sheets.map((s) => s.name))
  let n = ws.sheets.length + 1
  while (used.has(sheetName(n))) n++
  return {
    ...ws,
    seq,
    activeSheetId: id,
    sheets: [...ws.sheets, newSheet(id, sheetName(n), createTree(metric))],
  }
}

export function renameSheet(ws: EvidenceWorkspace, id: SheetId, name: string): EvidenceWorkspace {
  const trimmed = name.trim()
  if (!trimmed) return ws
  return {
    ...ws,
    sheets: ws.sheets.map((s) => (s.id === id ? { ...s, name: trimmed } : s)),
  }
}

/** シートを削除（最後の1枚は消せない）。選択中なら隣のシートを選ぶ。 */
export function removeSheet(ws: EvidenceWorkspace, id: SheetId): EvidenceWorkspace {
  if (ws.sheets.length <= 1) return ws
  const idx = ws.sheets.findIndex((s) => s.id === id)
  if (idx < 0) return ws
  const sheets = ws.sheets.filter((s) => s.id !== id)
  const activeSheetId =
    ws.activeSheetId === id ? sheets[Math.min(idx, sheets.length - 1)].id : ws.activeSheetId
  return { ...ws, sheets, activeSheetId }
}

export function selectSheet(ws: EvidenceWorkspace, id: SheetId): EvidenceWorkspace {
  if (!ws.sheets.some((s) => s.id === id)) return ws
  return { ...ws, activeSheetId: id }
}

/** 木にないノードの施策を捨てる */
function pruneMeasures(
  measures: EvidenceSheet['measures'],
  tree: EvidenceTree,
): EvidenceSheet['measures'] {
  const keys = Object.keys(measures)
  if (keys.every((k) => tree.nodes[k])) return measures
  const out: EvidenceSheet['measures'] = {}
  for (const k of keys) if (tree.nodes[k]) out[k] = measures[k]
  return out
}

/** シートのツリーを差し替える。消えたノードの施策も一緒に消える。 */
export function updateSheetTree(
  ws: EvidenceWorkspace,
  id: SheetId,
  tree: EvidenceTree,
): EvidenceWorkspace {
  return {
    ...ws,
    sheets: ws.sheets.map((s) =>
      s.id === id ? { ...s, tree, measures: pruneMeasures(s.measures, tree) } : s,
    ),
  }
}

/* ------------------------------------------------------------------ */
/* ⅳ 施策（ノードごと）                                                */
/* ------------------------------------------------------------------ */

function patchSheet(
  ws: EvidenceWorkspace,
  id: SheetId,
  fn: (s: EvidenceSheet) => EvidenceSheet,
): EvidenceWorkspace {
  return { ...ws, sheets: ws.sheets.map((s) => (s.id === id ? fn(s) : s)) }
}

/** ノードに施策を追加（after の直後。省略時は末尾）。ルートや存在しないノードには付けない。 */
export function addMeasure(
  ws: EvidenceWorkspace,
  sheetId: SheetId,
  nodeId: EvidenceNodeId,
  text = '',
  after?: string,
): { ws: EvidenceWorkspace; id: string } {
  const sheet = ws.sheets.find((s) => s.id === sheetId)
  if (!sheet || !sheet.tree.nodes[nodeId] || nodeId === sheet.tree.rootId) {
    return { ws, id: '' }
  }
  const measureSeq = sheet.measureSeq + 1
  const id = `m${measureSeq}`
  const list = [...(sheet.measures[nodeId] ?? [])]
  const at = after ? list.findIndex((m) => m.id === after) : -1
  const item: Measure = { id, text }
  if (at >= 0) list.splice(at + 1, 0, item)
  else list.push(item)
  return {
    id,
    ws: patchSheet(ws, sheetId, (s) => ({
      ...s,
      measureSeq,
      measures: { ...s.measures, [nodeId]: list },
    })),
  }
}

export function updateMeasure(
  ws: EvidenceWorkspace,
  sheetId: SheetId,
  nodeId: EvidenceNodeId,
  measureId: string,
  text: string,
): EvidenceWorkspace {
  return patchSheet(ws, sheetId, (s) => {
    const list = s.measures[nodeId]
    if (!list?.some((m) => m.id === measureId)) return s
    return {
      ...s,
      measures: {
        ...s.measures,
        [nodeId]: list.map((m) => (m.id === measureId ? { ...m, text } : m)),
      },
    }
  })
}

export function removeMeasure(
  ws: EvidenceWorkspace,
  sheetId: SheetId,
  nodeId: EvidenceNodeId,
  measureId: string,
): EvidenceWorkspace {
  return patchSheet(ws, sheetId, (s) => {
    const list = s.measures[nodeId]
    if (!list) return s
    const next = list.filter((m) => m.id !== measureId)
    const measures = { ...s.measures }
    if (next.length) measures[nodeId] = next
    else delete measures[nodeId]
    return { ...s, measures }
  })
}

/** 中身のある施策の数 */
export function filledMeasureCount(sheet: EvidenceSheet, nodeId: EvidenceNodeId): number {
  return (sheet.measures[nodeId] ?? []).filter((m) => m.text.trim() !== '').length
}

/** 全シートのルート名を ⅰ の指標にそろえる（ルートは INTAKE に紐づく） */
export function syncRootLabel(ws: EvidenceWorkspace, metric: string): EvidenceWorkspace {
  if (ws.sheets.every((s) => s.tree.nodes[s.tree.rootId]?.label === metric)) return ws
  return {
    ...ws,
    sheets: ws.sheets.map((s) => {
      const root = s.tree.nodes[s.tree.rootId]
      if (!root || root.label === metric) return s
      return {
        ...s,
        tree: { ...s.tree, nodes: { ...s.tree.nodes, [root.id]: { ...root, label: metric } } },
      }
    }),
  }
}

/* ------------------------------------------------------------------ */
/* 赤ピン（全シート合計で最大3）                                       */
/* ------------------------------------------------------------------ */

export function pinKey(sheetId: SheetId, nodeId: EvidenceNodeId): string {
  return `${sheetId}/${nodeId}`
}

export function parsePinKey(key: string): { sheetId: SheetId; nodeId: EvidenceNodeId } {
  const i = key.indexOf('/')
  return { sheetId: key.slice(0, i), nodeId: key.slice(i + 1) }
}

export function isPinValid(ws: EvidenceWorkspace, key: string): boolean {
  const { sheetId, nodeId } = parsePinKey(key)
  const sheet = ws.sheets.find((s) => s.id === sheetId)
  return !!sheet && canPin(sheet.tree, nodeId)
}

export function toggleWorkspacePin(
  ws: EvidenceWorkspace,
  pins: string[],
  key: string,
  max = MAX_PINS,
): string[] {
  const current = pins.filter((p) => isPinValid(ws, p))
  if (current.includes(key)) return current.filter((p) => p !== key)
  if (!isPinValid(ws, key) || current.length >= max) return current
  return [...current, key]
}

/** CAPTAIN 用の候補：全シートのピン可能ノード（id はピンキー） */
export function workspaceCandidates(ws: EvidenceWorkspace): Candidate[] {
  return ws.sheets.flatMap((s) =>
    treeToCandidates(s.tree).map((c) => ({
      ...c,
      id: pinKey(s.id, c.id),
      summary: `${s.name}：${c.summary.replace(/^経路：/, '')}`,
    })),
  )
}

/* ------------------------------------------------------------------ */
/* 保存データ                                                          */
/* ------------------------------------------------------------------ */

function isMeasures(v: unknown): v is EvidenceSheet['measures'] {
  if (!v || typeof v !== 'object') return false
  return Object.values(v as Record<string, unknown>).every(
    (list) =>
      Array.isArray(list) &&
      list.every(
        (m) => m && typeof (m as Measure).id === 'string' && typeof (m as Measure).text === 'string',
      ),
  )
}

function hasSheetsShape(w: Partial<EvidenceWorkspace>): boolean {
  return (
    typeof w.seq === 'number' &&
    typeof w.activeSheetId === 'string' &&
    Array.isArray(w.sheets) &&
    w.sheets.length > 0 &&
    w.sheets.every(
      (s) => s && typeof s.id === 'string' && typeof s.name === 'string' && isEvidenceTree(s.tree),
    )
  )
}

export function isWorkspace(v: unknown): v is EvidenceWorkspace {
  if (!v || typeof v !== 'object') return false
  const w = v as Partial<EvidenceWorkspace>
  if (w.version !== 4 || !hasSheetsShape(w)) return false
  return w.sheets!.every((s) => isMeasures(s.measures) && typeof s.measureSeq === 'number')
}

/** v3（施策なしの切り口）か */
function isWorkspaceV3(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false
  const w = v as { version?: unknown }
  return w.version === 3 && hasSheetsShape(v as Partial<EvidenceWorkspace>)
}

function fixActive(ws: EvidenceWorkspace): EvidenceWorkspace {
  return ws.sheets.some((s) => s.id === ws.activeSheetId)
    ? ws
    : { ...ws, activeSheetId: ws.sheets[0].id }
}

/**
 * 保存データを読み込む。新しい順に試す：
 * v4 はそのまま、v3（施策なし）は施策を空で追加、v2（単一ツリー）は「切り口1」に移す。
 * それ以外（旧 v1 や壊れたデータ）は null → 呼び出し側で新規作成。
 * どの場合もルート名は ⅰ の指標にそろえ、木にないノードの施策は捨てる。
 */
export function migrateWorkspace(
  saved: { v4?: unknown; v3?: unknown; v2?: unknown },
  metric: string,
): EvidenceWorkspace | null {
  let ws: EvidenceWorkspace | null = null
  if (isWorkspace(saved.v4)) {
    ws = saved.v4
  } else if (isWorkspaceV3(saved.v3)) {
    const v3 = saved.v3 as { seq: number; activeSheetId: string; sheets: { id: string; name: string; tree: EvidenceTree }[] }
    ws = {
      version: 4,
      seq: v3.seq,
      activeSheetId: v3.activeSheetId,
      sheets: v3.sheets.map((s) => newSheet(s.id, s.name, s.tree)),
    }
  } else if (isEvidenceTree(saved.v2)) {
    ws = { version: 4, seq: 1, activeSheetId: 's1', sheets: [newSheet('s1', sheetName(1), saved.v2)] }
  }
  if (!ws) return null
  ws = fixActive(ws)
  ws = {
    ...ws,
    sheets: ws.sheets.map((s) => ({ ...s, measures: pruneMeasures(s.measures, s.tree) })),
  }
  return syncRootLabel(ws, metric)
}
