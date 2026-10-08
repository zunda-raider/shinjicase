import { describe, expect, it } from 'vitest'
import { addSibling, createTree, exampleTree, renameNode, splitFormula } from './evidenceTree'
import {
  activeSheet,
  addSheet,
  createWorkspace,
  exampleWorkspace,
  migrateWorkspace,
  pinKey,
  removeSheet,
  renameSheet,
  selectSheet,
  syncRootLabel,
  toggleWorkspacePin,
  updateSheetTree,
  workspaceCandidates,
} from './workspace'
import type { EvidenceWorkspace } from '../types'

function nodeId(ws: EvidenceWorkspace, sheetId: string, label: string) {
  const s = ws.sheets.find((x) => x.id === sheetId)!
  return Object.values(s.tree.nodes).find((n) => n.label === label)!.id
}

describe('sheets (alternative decompositions of the same metric)', () => {
  it('starts with 切り口1 whose root is the INTAKE metric', () => {
    const ws = createWorkspace('売上')
    expect(ws.sheets.map((s) => s.name)).toEqual(['切り口1'])
    expect(activeSheet(ws).tree.nodes.root.label).toBe('売上')
  })

  it('adds sheets named 切り口N, every root = 売上, and selects the new one', () => {
    let ws = createWorkspace('売上')
    ws = addSheet(ws, '売上')
    ws = addSheet(ws, '売上')
    expect(ws.sheets.map((s) => s.name)).toEqual(['切り口1', '切り口2', '切り口3'])
    expect(ws.sheets.every((s) => s.tree.nodes[s.tree.rootId].label === '売上')).toBe(true)
    expect(ws.activeSheetId).toBe(ws.sheets[2].id)
    // 名前が重複しない
    ws = removeSheet(ws, ws.sheets[1].id)
    ws = addSheet(ws, '売上')
    expect(new Set(ws.sheets.map((s) => s.name)).size).toBe(ws.sheets.length)
  })

  it('renames a sheet (ignores blank names)', () => {
    const ws = createWorkspace('売上')
    const r = renameSheet(ws, 's1', ' 顧客数×単価 ')
    expect(r.sheets[0].name).toBe('顧客数×単価')
    expect(renameSheet(r, 's1', '   ')).toBe(r)
  })

  it('removes a sheet but never the last one; active falls to a neighbour', () => {
    let ws = addSheet(addSheet(createWorkspace('売上'), '売上'), '売上')
    ws = selectSheet(ws, 's2')
    ws = removeSheet(ws, 's2')
    expect(ws.sheets.map((s) => s.id)).toEqual(['s1', 's3'])
    expect(ws.activeSheetId).toBe('s3')
    ws = removeSheet(removeSheet(ws, 's3'), 's1')
    expect(ws.sheets).toHaveLength(1)
  })

  it('keeps sheet trees independent', () => {
    let ws = exampleWorkspace('売上')
    expect(splitFormula(ws.sheets[0].tree, 'root')).toBe('顧客数 × 客単価')
    expect(splitFormula(ws.sheets[1].tree, 'root')).toBe('店舗数 × 店舗あたり売上')
    const t = addSibling(ws.sheets[1].tree, nodeId(ws, 's2', '店舗数'), '稼働率').tree
    ws = updateSheetTree(ws, 's2', t)
    expect(splitFormula(ws.sheets[1].tree, 'root')).toBe('店舗数 × 稼働率 × 店舗あたり売上')
    expect(splitFormula(ws.sheets[0].tree, 'root')).toBe('顧客数 × 客単価')
  })

  it('keeps every root tied to the INTAKE metric', () => {
    let ws = exampleWorkspace('売上')
    ws = updateSheetTree(ws, 's1', renameNode(ws.sheets[0].tree, 'root', '利益'))
    ws = syncRootLabel(ws, '売上')
    expect(ws.sheets.map((s) => s.tree.nodes.root.label)).toEqual(['売上', '売上'])
    const ws2 = syncRootLabel(ws, '粗利')
    expect(ws2.sheets.map((s) => s.tree.nodes.root.label)).toEqual(['粗利', '粗利'])
  })
})

describe('global red pins across sheets', () => {
  it('allows at most 3 pins in total across all sheets', () => {
    const ws = exampleWorkspace('売上')
    let pins: string[] = []
    pins = toggleWorkspacePin(ws, pins, pinKey('s1', nodeId(ws, 's1', '既存顧客')))
    pins = toggleWorkspacePin(ws, pins, pinKey('s1', nodeId(ws, 's1', '新規顧客')))
    pins = toggleWorkspacePin(ws, pins, pinKey('s2', nodeId(ws, 's2', '店舗数')))
    pins = toggleWorkspacePin(ws, pins, pinKey('s2', nodeId(ws, 's2', '店舗あたり売上')))
    expect(pins).toHaveLength(3)
    expect(pins).toContain(pinKey('s2', nodeId(ws, 's2', '店舗数')))
    // ルート不可
    expect(toggleWorkspacePin(ws, [], pinKey('s2', 'root'))).toEqual([])
    // シートを消すとそのシートのピンは無効
    const gone = removeSheet(ws, 's2')
    expect(
      toggleWorkspacePin(gone, pins, pinKey('s1', nodeId(ws, 's1', '既存顧客'))),
    ).toEqual([pinKey('s1', nodeId(ws, 's1', '新規顧客'))])
  })

  it('labels candidates with the sheet name', () => {
    const ws = exampleWorkspace('売上')
    const c = workspaceCandidates(ws)
    expect(c).toHaveLength(6)
    expect(c.find((x) => x.title === '店舗数')?.summary).toBe('店舗数×店舗あたり売上：売上 › 店舗数')
  })
})

describe('migration', () => {
  it('moves an old single tree (v2) into 切り口1', () => {
    const ws = migrateWorkspace({ v2: exampleTree('売上') }, '売上')!
    expect(ws.sheets).toHaveLength(1)
    expect(ws.sheets[0].name).toBe('切り口1')
    expect(splitFormula(ws.sheets[0].tree, 'root')).toBe('顧客数 × 客単価')
  })

  it('upgrades v3 (sheets without measures) to v4 with empty measures', () => {
    const ex = exampleWorkspace('売上')
    const v3 = {
      version: 3,
      seq: ex.seq,
      activeSheetId: 's2',
      sheets: ex.sheets.map(({ id, name, tree }) => ({ id, name, tree })),
    }
    const ws = migrateWorkspace({ v3 }, '売上')!
    expect(ws.version).toBe(4)
    expect(ws.activeSheetId).toBe('s2')
    expect(ws.sheets.map((s) => s.name)).toEqual(['顧客数×単価', '店舗数×店舗あたり売上'])
    expect(ws.sheets.every((s) => Object.keys(s.measures).length === 0 && s.measureSeq === 0)).toBe(true)
    // v3 そのものは v4 として扱わない
    expect(migrateWorkspace({ v4: v3 }, '売上')).toBeNull()
  })

  it('prefers v4, fixes a dangling active sheet, rejects garbage', () => {
    const v4 = { ...exampleWorkspace('売上'), activeSheetId: 'zzz' }
    const ws = migrateWorkspace({ v4, v2: createTree('売上') }, '売上')!
    expect(ws.sheets).toHaveLength(2)
    expect(ws.activeSheetId).toBe('s1')
    expect(migrateWorkspace({ v4: { version: 4, sheets: [] }, v2: { foo: 1 } }, '売上')).toBeNull()
  })
})
