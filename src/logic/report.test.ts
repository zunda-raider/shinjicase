import { createWarrantState, setReason, setRole } from './warrant'
import { describe, expect, it } from 'vitest'
import { STUB_INTAKE } from '../data/intake'
import { addMeasure, exampleWorkspace, pinKey } from './workspace'
import {
  buildScorePacket,
  createPitchCard,
  createReportScript,
  draftReportScript,
  ensureReportScript,
  setReportScriptText,
} from './report'
import {
  createSummaryState,
  ensureDefaultCards,
  isSummaryState,
  loadSummaryState,
  pruneSummaryCards,
  summaryMeasures,
  setFeaturedMeasures,
  updatePitchCard,
} from './summary'
import { scoreByRubric, scoreInputFromPlayer } from '../scoring/rubricScorer'
import type { EvidenceWorkspace } from '../types'

function nid(ws: EvidenceWorkspace, sheetId: string, label: string) {
  return Object.values(ws.sheets.find((s) => s.id === sheetId)!.tree.nodes).find((n) => n.label === label)!.id
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
    const r = createSummaryState()
    expect(r.version).toBe(3)
    expect(r.cards).toEqual([])
    expect(isSummaryState(r)).toBe(true)
    expect(isSummaryState({ version: 2, cards: [] })).toBe(false)
    expect(loadSummaryState(null).cards).toEqual([])
  })

  it('auto-fills up to 2 cards from ranked measures, preserves edits on same key', () => {
    const { ws, pins } = setup()
    const measures = summaryMeasures(ws, pins, createWarrantState())
    let r = ensureDefaultCards(createSummaryState(), measures, STUB_INTAKE)
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
    const measures = summaryMeasures(ws, pins, createWarrantState())
    let r = setFeaturedMeasures(createSummaryState(), [keys.a, keys.c, keys.b], measures, STUB_INTAKE)
    expect(r.cards.map((c) => c.measureKey)).toEqual([keys.a, keys.c])
    r = updatePitchCard(r, 1, { effect: '法人開拓で新規を増やす' })
    r = setFeaturedMeasures(r, [keys.c, keys.b], measures, STUB_INTAKE)
    expect(r.cards[0].measureKey).toBe(keys.c)
    expect(r.cards[0].effect).toBe('法人開拓で新規を増やす')
    expect(r.cards[1].measureKey).toBe(keys.b)
  })

  it('prunes cards when measures disappear', () => {
    const { ws, pins, keys } = setup()
    const measures = summaryMeasures(ws, pins, createWarrantState())
    let r = setFeaturedMeasures(createSummaryState(), [keys.a, keys.c], measures, STUB_INTAKE)
    const onlyC = measures.filter((m) => m.key === keys.c)
    r = pruneSummaryCards(r, onlyC)
    expect(r.cards.map((c) => c.measureKey)).toEqual([keys.c])
  })
})

describe('score packet + offline', () => {
  it('builds a pitch packet and returns a shaped offline score', () => {
    const { ws, pins, keys } = setup()
    const warrant = setReason(setRole(createWarrantState(), keys.a, 'main'), keys.a, '効果が大きく、すぐ始められる')
    const measures = summaryMeasures(ws, pins, warrant)
    let report = setFeaturedMeasures(createSummaryState(), [keys.a, keys.c], measures, STUB_INTAKE)
    report = updatePitchCard(report, 0, {
      current: '既存顧客の来店頻度が落ちている。',
      effect: '洗車サブスクで来店回数を戻す。',
    })
    const script = ensureReportScript(createReportScript(), report.cards, STUB_INTAKE)
    const packet = buildScorePacket({
      intake: STUB_INTAKE,
      ws,
      pins,
      motives: { [pins[0]]: '来店頻度低下が主因である' },
      warrant,
      summary: report,
      script,
    })
    expect(packet.pitches).toHaveLength(2)
    expect(packet.pitches[0].premiseDefinition).toContain('売上')
    expect(packet.pitches[0].where).toContain('既存顧客')
    const input = scoreInputFromPlayer({ caseId: 'nocase', intake: STUB_INTAKE, ws, pins, motives: { [pins[0]]: '来店頻度低下が主因である' }, warrant, summary: report, script })
    const score = scoreByRubric(input)
    expect(score.source).toBe('rule')
    expect(score.total).toBeGreaterThanOrEqual(0)
    expect(score.total).toBeLessThanOrEqual(100)
    expect(['S', 'A', 'B', 'C', 'D']).toContain(score.grade)
    expect(score.criteria).toHaveLength(6)
    // deterministic
    expect(scoreByRubric(input).total).toBe(score.total)
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
        role: '',
        reason: '',
        rank: 1,
      },
      STUB_INTAKE,
    )
    expect(card.premiseClient).toContain('ブルーオアシス')
    expect(card.goal).toContain('×1.3')
    expect(card.where).toBe('1-1 既存顧客')
    expect(card.effect).toContain('洗車サブスク')
  })
})

describe('auto featured', () => {
  it('follows ranking until manual swap', () => {
    const base = [
      { key: 'a', rank: 1 },
      { key: 'b', rank: 2 },
      { key: 'c', rank: 3 },
    ].map((x) => ({
      ...x, sheetId: 's1', sheetName: 'S', nodeId: 'n', number: '1', nodeLabel: 'N',
      measureId: 'm', text: x.key, pinned: true, pinNo: 1, role: '' as const, reason: '',
    }))
    let r = ensureDefaultCards(createSummaryState(), base, STUB_INTAKE)
    expect(r.cards.map((c) => c.measureKey)).toEqual(['a', 'b'])
    const reordered = [base[2], base[0], base[1]]
    r = ensureDefaultCards(r, reordered, STUB_INTAKE)
    expect(r.cards.map((c) => c.measureKey)).toEqual(['c', 'a'])
    r = { ...r, manual: true }
    expect(ensureDefaultCards(r, base, STUB_INTAKE).cards.map((c) => c.measureKey)).toEqual(['c', 'a'])
  })
})


describe('REPORT script', () => {
  it('drafts prose from SUMMARY cards and locks after manual edit', () => {
    const cards = [
      {
        measureKey: 'a',
        premiseDefinition: '売上＝来店×単価',
        premiseClient: '店長',
        premiseTarget: '売上 ×1.2／3年',
        current: '朝の単価が低い',
        goal: '売上 ×1.2／3年',
        where: '1-1 朝',
        effect: 'コーヒー無料で単価を上げる',
      },
    ]
    const text = draftReportScript(cards, STUB_INTAKE)
    expect(text).toContain('本日は')
    expect(text).toContain('朝の単価が低い')
    expect(text).toContain('コーヒー無料')
    let script = ensureReportScript(createReportScript(), cards, STUB_INTAKE)
    expect(script.text).toBe(text)
    script = setReportScriptText(script, '手で直した台本です。', cards)
    expect(script.manual).toBe(true)
    const changed = [{ ...cards[0], current: '別の現状' }]
    expect(ensureReportScript(script, changed, STUB_INTAKE).text).toBe('手で直した台本です。')
  })
})
