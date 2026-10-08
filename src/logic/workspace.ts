import type {
  Candidate,
  EvidenceNodeId,
  EvidenceSheet,
  EvidenceTree,
  EvidenceWorkspace,
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

export function createWorkspace(metric: string): EvidenceWorkspace {
  return {
    version: 3,
    seq: 1,
    activeSheetId: 's1',
    sheets: [{ id: 's1', name: sheetName(1), tree: createTree(metric) }],
  }
}

/** 例：切り口1 = 顧客数 × 客単価（顧客数 = 既存顧客 ＋ 新規顧客）、切り口2 = 店舗数 × 店舗あたり売上 */
export function exampleWorkspace(metric: string): EvidenceWorkspace {
  const t2 = decompose(createTree(metric), ROOT_ID, 'mul', ['店舗数', '店舗あたり売上']).tree
  return {
    version: 3,
    seq: 2,
    activeSheetId: 's1',
    sheets: [
      { id: 's1', name: '顧客数×単価', tree: exampleTree(metric) },
      { id: 's2', name: '店舗数×店舗あたり売上', tree: t2 },
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
    sheets: [...ws.sheets, { id, name: sheetName(n), tree: createTree(metric) }],
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

export function updateSheetTree(
  ws: EvidenceWorkspace,
  id: SheetId,
  tree: EvidenceTree,
): EvidenceWorkspace {
  return {
    ...ws,
    sheets: ws.sheets.map((s) => (s.id === id ? { ...s, tree } : s)),
  }
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

export function isWorkspace(v: unknown): v is EvidenceWorkspace {
  if (!v || typeof v !== 'object') return false
  const w = v as Partial<EvidenceWorkspace>
  if (w.version !== 3 || typeof w.seq !== 'number' || typeof w.activeSheetId !== 'string') {
    return false
  }
  if (!Array.isArray(w.sheets) || w.sheets.length === 0) return false
  return w.sheets.every(
    (s) => s && typeof s.id === 'string' && typeof s.name === 'string' && isEvidenceTree(s.tree),
  )
}

/**
 * 保存データを読み込む。v3 はそのまま、v2（単一ツリー）は「切り口1」に移す。
 * それ以外（旧 v1 や壊れたデータ）は null → 呼び出し側で新規作成。
 * どの場合もルート名は ⅰ の指標にそろえる。
 */
export function migrateWorkspace(
  v3: unknown,
  v2: unknown,
  metric: string,
): EvidenceWorkspace | null {
  if (isWorkspace(v3)) {
    const ws = v3.sheets.some((s) => s.id === v3.activeSheetId)
      ? v3
      : { ...v3, activeSheetId: v3.sheets[0].id }
    return syncRootLabel(ws, metric)
  }
  if (isEvidenceTree(v2)) {
    return syncRootLabel(
      {
        version: 3,
        seq: 1,
        activeSheetId: 's1',
        sheets: [{ id: 's1', name: sheetName(1), tree: v2 }],
      },
      metric,
    )
  }
  return null
}
