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
              expect(node.kind).toMatch(/^(split|extract|analysis)$/)
              if (node.kind !== 'split') analysis++
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

  it('式の項・セグメント（客層・時間帯・カテゴリ）は必ず分解。分析は原因・理由・動機・課題だけ', () => {
    const TERM = /^(客数|単価|客単価|頻度|朝|昼|夜|通勤客|住民|来店客数|1日の来店客数|購入率|購買率|通過人数|来店割合|商圏人数|当店の選択率|コンビニ選択率|近隣住民数|食事の回数|買上点数|いつもの点数|レジ台数|稼働率|既存顧客|衣料品|食品|化粧品|その他|店頭|外商|ギフト|催事|朝・昼|夕方以降)/
    // 原文で「X ← Y」と書かれた項は分析（式の項ではない）
    const ARROW: Record<string, string[]> = { conbini1: ['レジの回転率'], conbini2: ['リピート'], conbini3: ['来店頻度', '1回あたりの点数'] }
    const list = new Set<string>()
    for (const c of SAMPLE_CASES)
      for (const st of getModelStudents(c.id))
        for (const mode of ['GHOST', 'GOD'] as const)
          for (const sh of buildModelView(st, mode).ws.sheets)
            for (const n of Object.values(sh.tree.nodes)) {
              if (!n.parentId) continue
              if (TERM.test(n.label) && !(ARROW[`${c.id}${st.no}`] ?? []).includes(n.label)) expect([c.id, st.no, mode, n.label, n.kind]).toEqual([c.id, st.no, mode, n.label, 'split'])
              if (n.kind !== 'split') list.add(`${c.id}${st.no} ${n.kind} ${n.label}`)
            }
    expect([...list].sort()).toMatchSnapshot()
  })

  it('コンビニ GOD 4：要因・ニーズは分析、式の項は分解', () => {
    const t = buildModelView(getModelStudents('conbini')[3], 'GOD').ws.sheets[0].tree
    const k = (l: string) => Object.values(t.nodes).find((x) => (x.note ?? x.label).startsWith(l))!.kind
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
    const e = toggleNodeKind(t, a.id)
    expect(e.nodes[a.id].kind).toBe('extract')
    expect(splitFormula(e, 'root')).toBe('客数 × 客単価')
    expect(toggleNodeKind(e, a.id).nodes[a.id].kind).toBe('analysis')
    expect(splitFormula(t, 'root')).toBe('客数 × 客単価 × 購入動機')
    // 分析だけの子を持つ葉にも × 分解できる（分解の子が左に入る）
    let u = addAnalysisChild(createTree('売上'), 'root', '課題').tree
    u = decompose(u, 'root', 'add', ['A', 'B']).tree
    expect(u.nodes.root.children.map((c) => u.nodes[c].label)).toEqual(['A', 'B', '課題'])
  })

  it('最初の5分の施策：GHOST は全部、GOD は GHOST と対応するものだけ', () => {
    const st = getModelStudents('conbini')[3]
    const god = buildModelView(st, 'GOD')
    const ms = Object.values(god.ws.sheets[0].measures).flat()
    const names = ms.filter((m) => god.initial.includes(m.id)).map((m) => m.text.split('：')[0])
    expect(names.sort()).toEqual(['A 水・おにぎりの限定割引（最優先）', 'B 菓子折りの包装サービス'])
    const gh = buildModelView(st, 'GHOST')
    expect(gh.initial).toHaveLength(Object.values(gh.ws.sheets[0].measures).flat().length)
  })

  it('短いラベル（≤14字）＋原文はツールチップ', () => {
    for (const c of SAMPLE_CASES)
      for (const st of getModelStudents(c.id))
        for (const sh of buildModelView(st, 'GOD').ws.sheets)
          for (const n of Object.values(sh.tree.nodes)) if (n.kind === 'analysis') expect([...n.label].length).toBeLessThanOrEqual(14)
    const t = buildModelView(getModelStudents('conbini')[1], 'GOD').ws.sheets[0].tree
    const n = Object.values(t.nodes).find((x) => x.label === '住宅客の需要')!
    expect(n.kind).toBe('extract')
    expect(n.note).toBe('住宅客の需要（品揃えがオフィス寄り）')
  })

  it('旧データは split に移行', () => {
    const t = decompose(createTree('売上'), 'root', 'mul', ['客数', '客単価']).tree
    const old = { ...t, nodes: Object.fromEntries(Object.entries(t.nodes).map(([k, v]) => [k, { ...v, kind: undefined }])) }
    expect(Object.values(withNodeKinds(old).nodes).every((x) => x.kind === 'split')).toBe(true)
    const ws = migrateWorkspace({ v2: old }, '売上')!
    expect(Object.values(ws.sheets[0].tree.nodes).every((x) => x.kind === 'split')).toBe(true)
  })
})
