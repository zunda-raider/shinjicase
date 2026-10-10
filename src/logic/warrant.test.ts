import { describe, expect, it } from 'vitest'
import {
  GRADE_SCORE,
  MAX_AXES,
  MIN_AXES,
  addAxis,
  clearRating,
  collectMeasures,
  createWarrantState,
  isFullyRated,
  isWarrantState,
  loadWarrantState,
  measureKey,
  measureScore,
  namedAxes,
  pruneWarrant,
  rankMeasures,
  removeAxis,
  renameAxis,
  setFinalAnswer,
  setRating,
  warrantCaptainLines,
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

describe('axes', () => {
  it('starts with 3 editable defaults and caps at 3', () => {
    let s = createWarrantState()
    expect(s.axes.map((a) => a.name)).toEqual(['効果', '実行しやすさ', '期間'])
    expect(addAxis(s).axes).toHaveLength(MAX_AXES) // already full
    s = removeAxis(s, s.axes[2].id)
    expect(s.axes).toHaveLength(2)
    s = addAxis(s, 'コスト')
    expect(s.axes.map((a) => a.name)).toEqual(['効果', '実行しやすさ', 'コスト'])
    expect(addAxis(s).axes).toHaveLength(MAX_AXES)
  })

  it('renames axes and refuses to go below 2; drops ratings for removed axis', () => {
    let s = createWarrantState()
    const a1 = s.axes[0].id
    const a3 = s.axes[2].id
    s = renameAxis(s, a1, 'Impact')
    expect(namedAxes(s).map((a) => a.name)).toContain('Impact')
    s = setRating(s, 's1/n/m1', a3, 'circle')
    s = setRating(s, 's1/n/m1', a1, 'triangle')
    s = removeAxis(s, a3)
    expect(s.axes).toHaveLength(MIN_AXES)
    expect(s.ratings['s1/n/m1']).toEqual({ [a1]: 'triangle' })
    expect(removeAxis(s, s.axes[0].id)).toBe(s) // min 2
    expect(renameAxis(s, 'nope', 'x')).toBe(s)
  })
})

describe('ratings and ranking', () => {
  it('sets, toggles off, and clears a grade', () => {
    let s = createWarrantState()
    const [a, b] = s.axes
    s = setRating(s, 'k1', a.id, 'circle')
    expect(s.ratings.k1[a.id]).toBe('circle')
    s = setRating(s, 'k1', a.id, 'circle') // toggle off
    expect(s.ratings.k1).toBeUndefined()
    s = setRating(s, 'k1', a.id, 'triangle')
    s = setRating(s, 'k1', b.id, 'cross')
    s = clearRating(s, 'k1', a.id)
    expect(s.ratings.k1).toEqual({ [b.id]: 'cross' })
  })

  it('scores ○=2 △=1 ✖=0 and ranks high to low; ties keep input order', () => {
    expect(GRADE_SCORE).toEqual({ circle: 2, triangle: 1, cross: 0 })
    const { ws, pins, keys } = withMeasures()
    let s = createWarrantState()
    const [a, b, c] = s.axes
    // wash: 2+2+2=6, app: 2+1+0=3, corp: 2+1+0=3 (tie → app before corp), franchise: 0+0+0=0
    for (const ax of [a, b, c]) s = setRating(s, keys.wash, ax.id, 'circle')
    s = setRating(s, keys.app, a.id, 'circle')
    s = setRating(s, keys.app, b.id, 'triangle')
    s = setRating(s, keys.app, c.id, 'cross')
    s = setRating(s, keys.corp, a.id, 'circle')
    s = setRating(s, keys.corp, b.id, 'triangle')
    s = setRating(s, keys.corp, c.id, 'cross')
    for (const ax of [a, b, c]) s = setRating(s, keys.franchise, ax.id, 'cross')

    const measures = collectMeasures(ws, pins)
    expect(measures.map((m) => m.text)).toEqual([
      '洗車サブスク',
      '会員アプリで来店回数UP',
      '法人カード営業',
      'フランチャイズ出店',
    ])
    expect(measures.filter((m) => m.pinned)).toHaveLength(3)
    expect(measureScore(s, keys.wash)).toBe(6)
    expect(isFullyRated(s, keys.app)).toBe(true)

    const ranked = rankMeasures(s, measures)
    expect(ranked.map((r) => [r.rank, r.text, r.score])).toEqual([
      [1, '洗車サブスク', 6],
      [2, '会員アプリで来店回数UP', 3],
      [3, '法人カード営業', 3],
      [4, 'フランチャイズ出店', 0],
    ])
  })

  it('puts incomplete ratings at the end of the ranking', () => {
    const { ws, pins, keys } = withMeasures()
    let s = createWarrantState()
    s = setRating(s, keys.corp, s.axes[0].id, 'circle') // incomplete
    for (const ax of s.axes) s = setRating(s, keys.wash, ax.id, 'triangle')
    const ranked = rankMeasures(s, collectMeasures(ws, pins))
    expect(ranked[0].text).toBe('洗車サブスク')
    expect(ranked[0].score).toBe(3)
    expect(ranked.find((r) => r.key === keys.corp)?.score).toBeNull()
    // 未完了は末尾にまとまる（同点は元の順）
    const incomplete = ranked.filter((r) => r.score === null)
    expect(incomplete.map((r) => r.key)).toEqual([keys.app, keys.corp, keys.franchise])
    expect(ranked.slice(-incomplete.length)).toEqual(incomplete)
  })
})

describe('measures from OPERATION', () => {
  it('drops ratings when a measure or node disappears', () => {
    let { ws, pins, keys, ids } = withMeasures()
    let s = createWarrantState()
    for (const ax of s.axes) s = setRating(s, keys.wash, ax.id, 'circle')
    for (const ax of s.axes) s = setRating(s, keys.corp, ax.id, 'triangle')
    ws = updateSheetTree(ws, 's1', removeSubtree(ws.sheets[0].tree, ids.existing))
    s = pruneWarrant(s, ws)
    expect(s.ratings[keys.wash]).toBeUndefined()
    expect(s.ratings[keys.corp]?.[s.axes[0].id]).toBe('triangle')
    expect(collectMeasures(ws, pins).map((m) => m.text)).toEqual([
      '法人カード営業',
      'フランチャイズ出店',
    ])
  })
})

describe('captain + persistence', () => {
  it('nudges missing axes/ratings and approves when complete', () => {
    const { ws, pins } = withMeasures()
    const measures = collectMeasures(ws, pins)
    let s = createWarrantState()
    s = { ...s, axes: s.axes.slice(0, 1) }
    expect(warrantCaptainLines(s, measures)[0]).toContain('最低 2 本')
    s = createWarrantState()
    s = renameAxis(s, s.axes[0].id, '')
    expect(warrantCaptainLines(s, measures)[0]).toContain('軸の名前が空')
    s = createWarrantState()
    expect(warrantCaptainLines(s, [])[0]).toContain('評点する施策がない')
    expect(warrantCaptainLines(s, measures)[0]).toContain('未評価の施策')
    for (const m of measures) {
      for (const ax of s.axes) s = setRating(s, m.key, ax.id, 'circle')
    }
    s = setFinalAnswer(s, '既存顧客向けに洗車サブスクを最優先する。')
    expect(warrantCaptainLines(s, measures)[1]).toContain('令状を承認できる')
  })

  it('validates and loads warrant state', () => {
    const ok = createWarrantState()
    expect(isWarrantState(ok)).toBe(true)
    expect(isWarrantState({ version: 1, axes: [], axisSeq: 0, ratings: {}, finalAnswer: '' })).toBe(
      true,
    )
    expect(isWarrantState({ version: 2 })).toBe(false)
    expect(loadWarrantState(null).axes).toHaveLength(3)
    expect(loadWarrantState({ version: 1, axes: [], axisSeq: 0, ratings: {}, finalAnswer: 'x' }).finalAnswer).toBe(
      'x',
    )
  })
})
