import { describe, expect, it } from 'vitest'
import {
  CARD_W,
  TREE_SIZE_COMPACT,
  addChild,
  addSibling,
  createTree,
  cycleSplitTag,
  decompose,
  exampleTree,
  isEvidenceTree,
  layoutTree,
  removeSubtree,
  renameNode,
  splitFormula,
  togglePin,
  toggleSplitKind,
  treeToCandidates,
} from './evidenceTree'
import type { EvidenceTree } from '../types'

function idOf(t: EvidenceTree, label: string): string {
  const n = Object.values(t.nodes).find((x) => x.label === label)
  if (!n) throw new Error(`no node ${label}`)
  return n.id
}

describe('evidence tree ops', () => {
  it('starts with the INTAKE metric as the root', () => {
    const t = createTree('売上')
    expect(t.nodes[t.rootId]).toMatchObject({ label: '売上', parentId: null, children: [] })
  })

  it('decomposes a node into a row of blank children with one operator', () => {
    const t0 = createTree('売上')
    const { tree, ids } = decompose(t0, t0.rootId, 'mul')
    expect(ids).toHaveLength(2)
    expect(tree.nodes[t0.rootId].children).toEqual(ids)
    expect(tree.nodes[t0.rootId].split).toEqual({ kind: 'mul' })
    ids.forEach((id) => expect(tree.nodes[id]).toMatchObject({ label: '', parentId: t0.rootId }))
    // 既に分解済みのノードは再分解しない
    expect(decompose(tree, t0.rootId, 'add').tree).toBe(tree)
    // 元のツリーは不変
    expect(t0.nodes[t0.rootId].children).toEqual([])
  })

  it('builds the example: 売上 = 顧客数 × 客単価, 顧客数 = 既存顧客 ＋ 新規顧客', () => {
    const t = exampleTree()
    expect(splitFormula(t, t.rootId)).toBe('顧客数 × 客単価')
    expect(splitFormula(t, idOf(t, '顧客数'))).toBe('既存顧客 ＋ 新規顧客')
    expect(splitFormula(t, idOf(t, '客単価'))).toBe('')
  })

  it('adds a sibling right after the node, sharing the parent operator', () => {
    const t = exampleTree()
    const existing = idOf(t, '既存顧客')
    const { tree, id } = addSibling(t, existing, '休眠顧客')
    expect(splitFormula(tree, idOf(tree, '顧客数'))).toBe('既存顧客 ＋ 休眠顧客 ＋ 新規顧客')
    expect(tree.nodes[id].parentId).toBe(idOf(t, '顧客数'))
    // ルートには兄弟を作れない
    expect(addSibling(t, t.rootId).tree).toBe(t)
    // 末尾追加
    const r = addChild(t, t.rootId, '購入頻度')
    expect(splitFormula(r.tree, t.rootId)).toBe('顧客数 × 客単価 × 購入頻度')
  })

  it('renames a node', () => {
    const t = exampleTree()
    const id = idOf(t, '客単価')
    expect(renameNode(t, id, '顧客単価').nodes[id].label).toBe('顧客単価')
  })

  it('toggles one operator per split and cycles × tags', () => {
    const t = exampleTree()
    const cust = idOf(t, '顧客数')
    let t2 = toggleSplitKind(t, cust)
    expect(splitFormula(t2, cust)).toBe('既存顧客 × 新規顧客')
    expect(splitFormula(t2, t.rootId)).toBe('顧客数 × 客単価') // 他の分解には影響なし
    t2 = cycleSplitTag(t2, cust)
    expect(t2.nodes[cust].split).toEqual({ kind: 'mul', tag: 'increase' })
    t2 = toggleSplitKind(t2, cust)
    expect(t2.nodes[cust].split).toEqual({ kind: 'add' })
    expect(cycleSplitTag(t2, cust).nodes[cust].split).toEqual({ kind: 'add' })
  })

  it('deletes a subtree; removing the last child clears the split; root is kept', () => {
    const t = exampleTree()
    const cust = idOf(t, '顧客数')
    const t2 = removeSubtree(t, cust)
    expect(t2.nodes[cust]).toBeUndefined()
    expect(Object.values(t2.nodes).map((n) => n.label)).toEqual(['売上', '客単価'])
    expect(t2.nodes[t.rootId].children).toEqual([idOf(t, '客単価')])
    const t3 = removeSubtree(t2, idOf(t, '客単価'))
    expect(t3.nodes[t.rootId].children).toEqual([])
    expect(t3.nodes[t.rootId].split).toBeUndefined()
    expect(removeSubtree(t, t.rootId)).toBe(t)
  })
})

describe('layoutTree', () => {
  it('puts the root on top, children one row down, centered under the parent', () => {
    const t = exampleTree()
    const L = layoutTree(t)
    const p = (label: string) => L.positions[idOf(t, label)]
    expect(p('顧客数').y).toBeGreaterThan(p('売上').y)
    expect(p('顧客数').y).toBe(p('客単価').y)
    expect(p('既存顧客').y).toBeGreaterThan(p('顧客数').y)
    expect(p('顧客数').x).toBeLessThan(p('客単価').x)
    expect(p('既存顧客').x).toBeLessThan(p('新規顧客').x)
    // 親は子の中央
    const mid = (p('既存顧客').x + p('新規顧客').x) / 2
    expect(Math.abs(p('顧客数').x - mid)).toBeLessThan(1)
    // 演算子：売上の分解に1つ、顧客数の分解に1つ
    expect(L.operators.map((o) => o.parentId).sort()).toEqual(
      [t.rootId, idOf(t, '顧客数')].sort(),
    )
  })

  it('never overlaps cards in the same row, even for a wide/deep tree', () => {
    let t = exampleTree()
    for (const label of ['既存顧客', '新規顧客', '客単価']) {
      t = decompose(t, idOf(t, label), 'add', [`${label}A`, `${label}B`, `${label}C`]).tree
    }
    t = decompose(t, idOf(t, '新規顧客A'), 'mul', ['x1', 'x2']).tree
    const L = layoutTree(t)
    const all = Object.entries(L.positions)
    expect(all).toHaveLength(Object.keys(t.nodes).length)
    for (const [a, pa] of all) {
      for (const [b, pb] of all) {
        if (a >= b || pa.y !== pb.y) continue
        expect(Math.abs(pa.x - pb.x)).toBeGreaterThanOrEqual(CARD_W)
      }
      expect(pa.x).toBeGreaterThanOrEqual(0)
      expect(pa.x + CARD_W).toBeLessThanOrEqual(L.width)
    }
  })
})

  it('compact size is about half and still non-overlapping', () => {
    const t = exampleTree()
    const L = layoutTree(t, TREE_SIZE_COMPACT)
    const N = layoutTree(t)
    expect(L.width).toBeLessThan(N.width * 0.6)
    expect(L.height).toBeLessThan(N.height * 0.65)
    const all = Object.entries(L.positions)
    for (const [a, pa] of all) {
      for (const [b, pb] of all) {
        if (a >= b || pa.y !== pb.y) continue
        expect(Math.abs(pa.x - pb.x)).toBeGreaterThanOrEqual(TREE_SIZE_COMPACT.cardW)
      }
    }
  })

describe('red pins on the tree', () => {
  it('pins up to 3 named non-root nodes and toggles off', () => {
    const t = exampleTree()
    let pins: string[] = []
    pins = togglePin(t, pins, t.rootId)
    expect(pins).toEqual([]) // ルート不可
    for (const l of ['既存顧客', '新規顧客', '客単価', '顧客数']) {
      pins = togglePin(t, pins, idOf(t, l))
    }
    expect(pins).toHaveLength(3)
    expect(pins).not.toContain(idOf(t, '顧客数'))
    pins = togglePin(t, pins, idOf(t, '客単価'))
    expect(pins).toHaveLength(2)
    // 空欄カードには刺せない
    const blank = addSibling(t, idOf(t, '客単価'))
    expect(togglePin(blank.tree, [], blank.id)).toEqual([])
    // 削除済みノードのピンは外れる
    const gone = removeSubtree(t, idOf(t, '顧客数'))
    expect(togglePin(gone, pins, idOf(t, '客単価'))).toEqual([idOf(t, '客単価')])
  })

  it('lists named non-root nodes as CAPTAIN candidates', () => {
    const t = exampleTree()
    expect(treeToCandidates(t).map((c) => c.title)).toEqual([
      '顧客数',
      '既存顧客',
      '新規顧客',
      '客単価',
    ])
  })
})

describe('persistence', () => {
  it('accepts v2 trees and rejects old/invalid data', () => {
    expect(isEvidenceTree(exampleTree())).toBe(true)
    expect(isEvidenceTree({ rootId: 'root', seq: 0, nodes: { root: { label: 'x' } } })).toBe(false)
    expect(isEvidenceTree(null)).toBe(false)
  })
})
