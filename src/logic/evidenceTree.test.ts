import { describe, expect, it } from 'vitest'
import {
  BOARD_W,
  CARD_W,
  addChild,
  createTree,
  cycleLinkTag,
  isEvidenceTree,
  moveNode,
  removeSubtree,
  renameNode,
  suggestChildPos,
  toggleLinkKind,
  treeToCandidates,
} from './evidenceTree'

function sampleTree() {
  let t = createTree('売上')
  const a = addChild(t, t.rootId, { x: 300, y: 100 }, 'mul', '顧客数')
  t = a.tree
  const b = addChild(t, t.rootId, { x: 300, y: 300 }, 'mul', '顧客単価')
  t = b.tree
  const c = addChild(t, a.id, { x: 550, y: 50 }, 'add', '既存')
  t = c.tree
  const d = addChild(t, a.id, { x: 550, y: 150 }, 'add', '新規')
  t = d.tree
  return { t, a: a.id, b: b.id, c: c.id, d: d.id }
}

describe('evidence tree', () => {
  it('creates a root card from the INTAKE metric', () => {
    const t = createTree('売上')
    expect(t.nodes[t.rootId].label).toBe('売上')
    expect(t.nodes[t.rootId].parentId).toBeNull()
  })

  it('adds a blank child linked to its parent', () => {
    const t0 = createTree('売上')
    const { tree, id } = addChild(t0, t0.rootId, { x: 300, y: 120 })
    expect(tree.nodes[id]).toMatchObject({
      label: '',
      parentId: t0.rootId,
      x: 300,
      y: 120,
      link: { kind: 'mul' },
    })
    // 元のツリーは変更しない
    expect(Object.keys(t0.nodes)).toHaveLength(1)
    // 存在しない親には付けない
    expect(addChild(t0, 'nope', { x: 0, y: 0 }).tree).toBe(t0)
  })

  it('renames a card', () => {
    const { t, a } = sampleTree()
    const t2 = renameNode(t, a, '来店客数')
    expect(t2.nodes[a].label).toBe('来店客数')
    expect(t.nodes[a].label).toBe('顧客数')
  })

  it('moves a card and clamps it inside the board', () => {
    const { t, a } = sampleTree()
    const t2 = moveNode(t, a, { x: 420, y: 222 })
    expect(t2.nodes[a]).toMatchObject({ x: 420, y: 222 })
    const t3 = moveNode(t, a, { x: 99999, y: -50 })
    expect(t3.nodes[a]).toMatchObject({ x: BOARD_W - CARD_W, y: 0 })
  })

  it('deletes a card together with its subtree, but never the root', () => {
    const { t, a, b, c, d } = sampleTree()
    const t2 = removeSubtree(t, a)
    expect(t2.nodes[a]).toBeUndefined()
    expect(t2.nodes[c]).toBeUndefined()
    expect(t2.nodes[d]).toBeUndefined()
    expect(t2.nodes[b]).toBeDefined()
    expect(removeSubtree(t, t.rootId)).toBe(t)
  })

  it('toggles × / ＋ and cycles mechanism tags', () => {
    const { t, a } = sampleTree()
    let t2 = cycleLinkTag(t, a)
    expect(t2.nodes[a].link).toEqual({ kind: 'mul', tag: 'increase' })
    t2 = toggleLinkKind(t2, a)
    expect(t2.nodes[a].link).toEqual({ kind: 'add' })
    // ＋ にはタグを付けない
    expect(cycleLinkTag(t2, a).nodes[a].link).toEqual({ kind: 'add' })
  })

  it('places a clicked thread to the right of the parent, below siblings', () => {
    const { t, a } = sampleTree()
    const pos = suggestChildPos(t, a)
    expect(pos.x).toBeGreaterThan(t.nodes[a].x)
    expect(pos.y).toBeGreaterThan(150)
  })

  it('converts named non-root cards into PRIME SUSPECT candidates (leaves first)', () => {
    const { t, a, c } = sampleTree()
    const blank = addChild(t, a, { x: 600, y: 400 }).tree
    const cands = treeToCandidates(blank)
    expect(cands.map((x) => x.title)).not.toContain('売上')
    expect(cands.map((x) => x.title)).not.toContain('')
    expect(cands).toHaveLength(4)
    expect(cands[cands.length - 1].id).toBe(a) // 中間ノードは後ろ
    expect(cands.find((x) => x.id === c)?.summary).toBe('経路：売上 › 顧客数 › 既存')
  })

  it('validates persisted data', () => {
    expect(isEvidenceTree(createTree('売上'))).toBe(true)
    expect(isEvidenceTree({ foo: 1 })).toBe(false)
    expect(isEvidenceTree(null)).toBe(false)
  })
})
