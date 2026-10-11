import { describe, expect, it } from 'vitest'
import {
  collectMeasures,
  createWarrantState,
  isWarrantDone,
  isWarrantState,
  loadWarrantState,
  measureKey,
  pruneWarrant,
  rankMeasures,
  setReason,
  setRole,
} from './warrant'
import {
  addMeasure,
  exampleWorkspace,
  pinKey,
  updateSheetTree,
} from './workspace'
import { removeSubtree } from './evidenceTree'
import type { EvidenceWorkspace } from '../types'

function nid(ws: EvidenceWorkspace, sheetId: string, label: string) {
  return Object.values(ws.sheets.find((s) => s.id === sheetId)!.tree.nodes).find(
    (n) => n.label === label,
  )!.id
}

function withMeasures() {
  let ws = exampleWorkspace('売上')
  const existing = nid(ws, 's1', '既存顧客')
  const fresh = nid(ws, 's1', '新規顧客')
  const stores = nid(ws, 's2', '店舗数')
  const a = addMeasure(ws, 's1', existing, '洗車サブスク')
  ws = a.ws
  const b = addMeasure(ws, 's1', existing, '会員アプリで来店回数UP')
  ws = b.ws
  const c = addMeasure(ws, 's1', fresh, '法人カード営業')
  ws = c.ws
  const d = addMeasure(ws, 's2', stores, 'フランチャイズ出店')
  ws = d.ws
  // 空の施策は無視される
  ws = addMeasure(ws, 's1', fresh, '   ').ws
  const pins = [pinKey('s1', existing), pinKey('s1', fresh)]
  return {
    ws,
    pins,
    keys: {
      wash: measureKey('s1', existing, a.id),
      app: measureKey('s1', existing, b.id),
      corp: measureKey('s1', fresh, c.id),
      franchise: measureKey('s2', stores, d.id),
    },
    ids: { existing, fresh, stores, a: a.id, b: b.id, c: c.id, d: d.id },
  }
}

describe('WARRANT：なぜその施策か', () => {
  it('collects measures (pinned first, empty ignored)', () => {
    const { ws, pins, keys } = withMeasures()
    const ms = collectMeasures(ws, pins)
    expect(ms.map((m) => m.key)).toEqual([keys.wash, keys.app, keys.corp, keys.franchise])
  })

  it('main is unique; ranking = メイン → サブ → OPERATION order', () => {
    const { ws, pins, keys } = withMeasures()
    let w = setRole(createWarrantState(), keys.corp, 'main')
    w = setRole(w, keys.franchise, 'sub')
    expect(rankMeasures(w, collectMeasures(ws, pins)).map((m) => m.key)).toEqual([keys.corp, keys.franchise, keys.wash, keys.app])
    w = setRole(w, keys.app, 'main')
    expect(w.roles[keys.corp]).toBe('sub')
    expect(rankMeasures(w, collectMeasures(ws, pins))[0].key).toBe(keys.app)
    w = setRole(w, keys.app, '')
    expect(w.roles[keys.app]).toBeUndefined()
  })

  it('done when main has a reason', () => {
    const { ws, pins, keys } = withMeasures()
    const ms = collectMeasures(ws, pins)
    let w = setRole(createWarrantState(), keys.wash, 'main')
    expect(isWarrantDone(w, ms)).toBe(false)
    w = setReason(w, keys.wash, 'すぐ始められて効果が大きい')
    expect(isWarrantDone(w, ms)).toBe(true)
  })

  it('drops roles/reasons of removed measures', () => {
    const { ws, keys, ids } = withMeasures()
    let w = setReason(setRole(createWarrantState(), keys.franchise, 'main'), keys.franchise, 'x')
    const sheet = ws.sheets.find((s) => s.id === 's2')!
    const ws2 = updateSheetTree(ws, 's2', removeSubtree(sheet.tree, ids.stores))
    w = pruneWarrant(w, ws2)
    expect(w.roles[keys.franchise]).toBeUndefined()
    expect(w.reasons[keys.franchise]).toBeUndefined()
  })

  it('migrates old axes/○△✖ data without crashing', () => {
    const old = { version: 1, axisSeq: 3, axes: [{ id: 'a1', name: '効果' }], ratings: { k: { a1: 'circle' } }, finalAnswer: 'x' }
    const w = loadWarrantState(old)
    expect(isWarrantState(w)).toBe(true)
    expect(w.roles).toEqual({})
    expect(w.finalAnswer).toBe('x')
    expect(loadWarrantState(null)).toEqual(createWarrantState())
    expect(loadWarrantState('junk').version).toBe(2)
  })
})
