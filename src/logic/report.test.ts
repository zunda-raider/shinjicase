import { describe, expect, it } from 'vitest'
import { STUB_INTAKE } from '../data/intake'
import { addMeasure, exampleWorkspace, pinKey } from './workspace'
import {
  buildScorePacket,
  createPitchCard,
  createReportState,
  ensureDefaultCards,
  isReportState,
  loadReportState,
  pruneReportCards,
  reportMeasures,
  setFeaturedMeasures,
  updatePitchCard,
} from './report'
import type { EvidenceWorkspace } from '../types'
import { scoreOffline } from '../scoring/offlineScorer'

function nid(ws: EvidenceWorkspace, sheetId: string, label: string) {
  return Object.values(ws.sheets.find((s) => s.id === sheetId)!.tree.nodes).find(
    (n) => n.label === label,
  )!.id
}

function setup() {
  let ws = exampleWorkspace('売上')
  const existing = nid(ws, 's1', '既存顧客')
  const fresh = nid(ws, 's1', '新規顧客')
  const a = addMeasure(ws, 's1', existing, '洗車サブスク')
  ws = a.ws
  const b = addMeasure(ws, 's1', existing, '会員アプリで来店回数UP')
  ws = b.ws
  const c = addMeasure(ws, 's1', fresh, '法人カード営業')
  ws = c.ws
  const pins = [pinKey('s1', existing), pinKey('s1', fresh)]
  return { ws, pins, keys: { a: `${'s1'}/${existing}/${a.id}`, b: `${'s1'}/${existing}/${b.id}`, c: `${'s1'}/${fresh}/${c.id}` } }
}

describe('report pitch cards', () => {
  it('creates empty v3 state and validates', () => {
    const r = createReportState()
    expect(r.version).toBe(3)
    expect(r.cards).toEqual([])
    expect(isReportState(r)).toBe(true)
    expect(isReportState({ version: 2, cards: [] })).toBe(false)
    expect(loadReportState(null).cards).toEqual([])
  })

  it('auto-fills up to 2 cards from ranked measures, preserves edits on same key', () => {
    const { ws, pins } = setup()
    const measures = reportMeasures(ws, pins, {
      version: 1,
      axisSeq: 0,
      axes: [],
      ratings: {},
      finalAnswer: '',
    })
    let r = ensureDefaultCards(createReportState(), measures, STUB_INTAKE)
    expect(r.cards).toHaveLength(2)
    expect(r.cards[0].premiseTarget).toContain('売上')
    expect(r.cards[0].where).toContain('既存顧客')
    expect(r.cards[0].effect).toContain('洗車サブスク')
    r = updatePitchCard(r, 0, { current: '既存客の来店が減っている' })
    const again = ensureDefaultCards(r, measures, STUB_INTAKE)
    expect(again.cards[0].current).toBe('既存客の来店が減っている')
  })

  it('setFeaturedMeasures caps at 2 and carries over card edits', () => {
    const { ws, pins, keys } = setup()
    const measures = reportMeasures(ws, pins, {
      version: 1,
      axisSeq: 0,
      axes: [],
      ratings: {},
      finalAnswer: '',
    })
    let r = setFeaturedMeasures(createReportState(), [keys.a, keys.c, keys.b], measures, STUB_INTAKE)
    expect(r.cards.map((c) => c.measureKey)).toEqual([keys.a, keys.c])
    r = updatePitchCard(r, 1, { effect: '法人開拓で新規を増やす' })
    r = setFeaturedMeasures(r, [keys.c, keys.b], measures, STUB_INTAKE)
    expect(r.cards[0].measureKey).toBe(keys.c)
    expect(r.cards[0].effect).toBe('法人開拓で新規を増やす')
    expect(r.cards[1].measureKey).toBe(keys.b)
  })

  it('prunes cards when measures disappear', () => {
    const { ws, pins, keys } = setup()
    const measures = reportMeasures(ws, pins, {
      version: 1,
      axisSeq: 0,
      axes: [],
      ratings: {},
      finalAnswer: '',
    })
    let r = setFeaturedMeasures(createReportState(), [keys.a, keys.c], measures, STUB_INTAKE)
    const onlyC = measures.filter((m) => m.key === keys.c)
    r = pruneReportCards(r, onlyC)
    expect(r.cards.map((c) => c.measureKey)).toEqual([keys.c])
  })
})

describe('score packet + offline', () => {
  it('builds a pitch packet and returns a shaped offline score', () => {
    const { ws, pins, keys } = setup()
    const warrant = {
      version: 1 as const,
      axisSeq: 3,
      axes: [
        { id: 'a1', name: '効果' },
        { id: 'a2', name: '実行しやすさ' },
        { id: 'a3', name: '期間' },
      ],
      ratings: {},
      finalAnswer: '洗車を優先',
    }
    const measures = reportMeasures(ws, pins, warrant)
    let report = setFeaturedMeasures(createReportState(), [keys.a, keys.c], measures, STUB_INTAKE)
    report = updatePitchCard(report, 0, {
      current: '既存顧客の来店頻度が落ちている。',
      effect: '洗車サブスクで来店回数を戻す。',
    })
    const packet = buildScorePacket({
      intake: STUB_INTAKE,
      ws,
      pins,
      motives: { [pins[0]]: '来店頻度低下が主因である' },
      warrant,
      report,
    })
    expect(packet.pitches).toHaveLength(2)
    expect(packet.pitches[0].premiseDefinition).toContain('売上')
    expect(packet.pitches[0].where).toContain('既存顧客')
    const score = scoreOffline(packet)
    expect(score.source).toBe('offline')
    expect(score.total).toBeGreaterThanOrEqual(0)
    expect(score.total).toBeLessThanOrEqual(100)
    expect(['S', 'A', 'B', 'C', 'D']).toContain(score.grade)
    expect(score.breakdown.structure).toBeGreaterThanOrEqual(0)
    expect(score.comment).toContain('オフライン採点')
    // deterministic
    expect(scoreOffline(packet).total).toBe(score.total)
  })
})

describe('createPitchCard seeds', () => {
  it('prefills premises from intake and where/effect from measure', () => {
    const card = createPitchCard(
      {
        key: 's1/n/m',
        sheetId: 's1',
        sheetName: '顧客数×単価',
        nodeId: 'n',
        number: '1-1',
        nodeLabel: '既存顧客',
        measureId: 'm',
        text: '洗車サブスク',
        pinned: true,
        pinNo: 1,
        score: 6,
        rank: 1,
        grades: {},
      },
      STUB_INTAKE,
    )
    expect(card.premiseClient).toContain('ブルーオアシス')
    expect(card.goal).toContain('×1.3')
    expect(card.where).toBe('1-1 既存顧客（切り口：顧客数×単価）')
    expect(card.effect).toContain('洗車サブスク')
  })
})
