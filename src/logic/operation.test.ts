import { describe, expect, it } from 'vitest'
import { addSibling, decompose, numberTree, removeSubtree } from './evidenceTree'
import { isSuspectState, operationCaptainLines, pinMeasureStatus } from './operation'
import {
  addMeasure,
  exampleWorkspace,
  filledMeasureCount,
  pinKey,
  removeMeasure,
  renameSheet,
  updateMeasure,
  updateSheetTree,
} from './workspace'
import type { EvidenceWorkspace } from '../types'

function nid(ws: EvidenceWorkspace, sheetId: string, label: string) {
  const s = ws.sheets.find((x) => x.id === sheetId)!
  return Object.values(s.tree.nodes).find((n) => n.label === label)!.id
}

describe('numberTree', () => {
  it('numbers hierarchically in tree order; root unnumbered', () => {
    const ws = exampleWorkspace('売上')
    const t = ws.sheets[0].tree
    const num = numberTree(t)
    const by = (l: string) => num[nid(ws, 's1', l)]
    expect(by('売上')).toBe('')
    expect(by('顧客数')).toBe('1')
    expect(by('既存顧客')).toBe('1-1')
    expect(by('新規顧客')).toBe('1-2')
    expect(by('客単価')).toBe('2')
  })

  it('renumbers by position when siblings are inserted/removed (ids stay)', () => {
    const ws = exampleWorkspace('売上')
    let t = ws.sheets[0].tree
    const existing = nid(ws, 's1', '既存顧客')
    const fresh = nid(ws, 's1', '新規顧客')
    const r = addSibling(t, existing, '休眠顧客')
    t = r.tree
    expect(numberTree(t)[r.id]).toBe('1-2')
    expect(numberTree(t)[fresh]).toBe('1-3')
    t = decompose(t, fresh, 'add', ['個人', '法人']).tree
    expect(Object.values(numberTree(t))).toContain('1-3-2')
    t = removeSubtree(t, existing)
    expect(numberTree(t)[r.id]).toBe('1-1')
  })
})

describe('measures per node', () => {
  it('adds, inserts after, edits and deletes measures', () => {
    let ws = exampleWorkspace('売上')
    const n = nid(ws, 's1', '既存顧客')
    const a = addMeasure(ws, 's1', n, '洗車サブスク')
    ws = a.ws
    const b = addMeasure(ws, 's1', n, '会員アプリで来店回数UP')
    ws = b.ws
    const c = addMeasure(ws, 's1', n, '', a.id) // a の直後
    ws = c.ws
    expect(ws.sheets[0].measures[n].map((m) => m.text)).toEqual([
      '洗車サブスク',
      '',
      '会員アプリで来店回数UP',
    ])
    expect(filledMeasureCount(ws.sheets[0], n)).toBe(2)
    ws = updateMeasure(ws, 's1', n, c.id, '給油ポイント2倍デー')
    expect(filledMeasureCount(ws.sheets[0], n)).toBe(3)
    ws = removeMeasure(ws, 's1', n, a.id)
    expect(ws.sheets[0].measures[n].map((m) => m.text)).toEqual([
      '給油ポイント2倍デー',
      '会員アプリで来店回数UP',
    ])
    // 他シートには影響しない
    expect(ws.sheets[1].measures).toEqual({})
    // ルートには付けない
    expect(addMeasure(ws, 's1', 'root', 'x').id).toBe('')
  })

  it('drops measures when the node (or its ancestor) is deleted in EVIDENCE', () => {
    let ws = exampleWorkspace('売上')
    const existing = nid(ws, 's1', '既存顧客')
    const price = nid(ws, 's1', '客単価')
    ws = addMeasure(ws, 's1', existing, '洗車サブスク').ws
    ws = addMeasure(ws, 's1', price, 'コーティング提案').ws
    ws = updateSheetTree(ws, 's1', removeSubtree(ws.sheets[0].tree, nid(ws, 's1', '顧客数')))
    expect(Object.keys(ws.sheets[0].measures)).toEqual([price])
  })
})

describe('operation checks', () => {
  it('warns about pinned suspects without measures', () => {
    let ws = exampleWorkspace('売上')
    const pins = [
      pinKey('s1', nid(ws, 's1', '既存顧客')),
      pinKey('s1', nid(ws, 's1', '新規顧客')),
    ]
    expect(operationCaptainLines(ws, [])[0]).toContain('容疑者が決まっていない')
    ws = addMeasure(ws, 's1', nid(ws, 's1', '既存顧客'), '洗車サブスク').ws
    const st = pinMeasureStatus(ws, pins)
    expect(st.map((s) => [s.number, s.measureCount])).toEqual([
      ['1-1', 1],
      ['1-2', 0],
    ])
    expect(operationCaptainLines(ws, pins)[0]).toBe('CAPTAIN「容疑者②『新規顧客』に作戦がない。」')
    ws = addMeasure(ws, 's1', nid(ws, 's1', '新規顧客'), '法人カード営業').ws
    expect(operationCaptainLines(ws, pins)[0]).toContain('全容疑者に作戦がある（合計 2 件）')
  })

  it('validates persisted pins/motives', () => {
    expect(isSuspectState({ pins: ['s1/n1'], motives: { 's1/n1': 'x' } })).toBe(true)
    expect(isSuspectState({ pins: [1], motives: {} })).toBe(false)
    expect(isSuspectState(null)).toBe(false)
  })
})

describe('tab rename', () => {
  it('renames active and inactive sheets, trims, rejects empty', () => {
    let ws = exampleWorkspace('売上')
    ws = renameSheet(ws, 's2', ' 給油＋給油以外 ')
    expect(ws.sheets[1].name).toBe('給油＋給油以外')
    expect(ws.activeSheetId).toBe('s1')
    expect(renameSheet(ws, 's1', '')).toBe(ws)
    expect(renameSheet(ws, 'nope', 'x').sheets.map((s) => s.name)).toEqual(
      ws.sheets.map((s) => s.name),
    )
  })
})
