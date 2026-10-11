import { describe, expect, it } from 'vitest'
import { getModelStudents } from '../data/models'
import { SAMPLE_CASES } from '../data/cases'
import { buildModelView } from './modelView'
import {
  addAnalysisChild,
  addSibling,
  createTree,
  decompose,
  layoutTree,
  nodeKind,
  splitFormula,
  toggleNodeKind,
  withNodeKinds,
} from './evidenceTree'
import { migrateWorkspace } from './workspace'

describe('ノードの種類（分解 / 分析・課題）', () => {
  it('全模範（両事件・GHOST/GOD）の全ノードに kind があり、演算子は分解どうしの間だけ', () => {
    let n = 0
    let analysis = 0
    for (const c of SAMPLE_CASES)
      for (const st of getModelStudents(c.id))
        for (const mode of ['GHOST', 'GOD'] as const)
          for (const sh of buildModelView(st, mode).ws.sheets) {
            for (const node of Object.values(sh.tree.nodes)) {
              if (!node.parentId) continue
              n++
              expect(node.kind).toMatch(/^(split|analysis)$/)
              if (node.kind === 'analysis') analysis++
            }
            for (const op of layoutTree(sh.tree).operators) {
              const p = sh.tree.nodes[op.parentId]
              const ordered = [...p.children].sort((a, b) => layoutTree(sh.tree).positions[a].x - layoutTree(sh.tree).positions[b].x)
              expect(nodeKind(sh.tree.nodes[ordered[op.index]])).toBe('split')
              expect(nodeKind(sh.tree.nodes[ordered[op.index + 1]])).toBe('split')
            }
          }
    expect(n).toBeGreaterThan(50)
    expect(analysis).toBeGreaterThan(5)
  })

  it('コンビニ GOD 4：要因・ニーズは分析、式の項は分解', () => {
    const t = buildModelView(getModelStudents('conbini')[3], 'GOD').ws.sheets[0].tree
    const k = (l: string) => Object.values(t.nodes).find((x) => x.label.startsWith(l))!.kind
    expect(k('通過人数')).toBe('split')
    expect(k('来店割合')).toBe('split')
    expect(k('顧客側の要因')).toBe('analysis')
    expect(k('必需品のニーズ')).toBe('analysis')
    expect(k('外部の要因')).toBe('analysis')
  })

  it('分析の子は式に入らず、分解と並べて置ける・切り替えられる', () => {
    let t = decompose(createTree('売上'), 'root', 'mul', ['客数', '客単価']).tree
    const a = addAnalysisChild(t, 'root', '購入動機')
    t = a.tree
    expect(splitFormula(t, 'root')).toBe('客数 × 客単価')
    expect(layoutTree(t).operators).toHaveLength(1)
    const s = addSibling(t, a.id, '理由')
    expect(s.tree.nodes[s.id].kind).toBe('analysis')
    t = toggleNodeKind(s.tree, a.id)
    expect(t.nodes[a.id].kind).toBe('split')
    expect(splitFormula(t, 'root')).toBe('客数 × 客単価 × 購入動機')
    // 分析だけの子を持つ葉にも × 分解できる（分解の子が左に入る）
    let u = addAnalysisChild(createTree('売上'), 'root', '課題').tree
    u = decompose(u, 'root', 'add', ['A', 'B']).tree
    expect(u.nodes.root.children.map((c) => u.nodes[c].label)).toEqual(['A', 'B', '課題'])
  })

  it('旧データは split に移行', () => {
    const t = decompose(createTree('売上'), 'root', 'mul', ['客数', '客単価']).tree
    const old = { ...t, nodes: Object.fromEntries(Object.entries(t.nodes).map(([k, v]) => [k, { ...v, kind: undefined }])) }
    expect(Object.values(withNodeKinds(old).nodes).every((x) => x.kind === 'split')).toBe(true)
    const ws = migrateWorkspace({ v2: old }, '売上')!
    expect(Object.values(ws.sheets[0].tree.nodes).every((x) => x.kind === 'split')).toBe(true)
  })
})
