import { describe, expect, it } from 'vitest'
import { CONBINI_STUDENTS } from '../data/models/conbini'
import { getIdeal } from '../data/ideals'
import { buildModelView } from '../logic/modelView'
import { createTree, decompose } from '../logic/evidenceTree'
import { addMeasure, newSheet } from '../logic/workspace'
import { withCaseChallenge } from '../logic/captain'
import { scoreByRubric, scoreInputFromModel, type ScoreInput } from './rubricScorer'

const score = (no: number, mode: 'GHOST' | 'GOD') =>
  scoreByRubric(scoreInputFromModel('conbini', buildModelView(CONBINI_STUDENTS[no - 1], mode)))

describe('コンビニ模範', () => {
  it('GOD 6人=100、GHOST≥85', () => {
    for (let no = 1; no <= 6; no++) {
      expect(score(no, 'GOD').total).toBe(100)
      expect(score(no, 'GHOST').total).toBeGreaterThanOrEqual(85)
    }
  })

  it('悪い回答（多店舗展開・ピンなし・前提なし）は40未満', () => {
    const t = decompose(createTree('売上'), 'root', 'add', ['新店', '広告']).tree
    let ws = { version: 4 as const, seq: 1, activeSheetId: 's1', sheets: [newSheet('s1', '切り口1', t)] }
    ws = addMeasure(ws, 's1', 'n1', '多店舗展開する').ws
    const bad: ScoreInput = {
      caseId: 'conbini', premises: [], numericTarget: false, years: 0, ws, pins: [], motives: {}, warrant: null,
      pitches: [{ premise: '', current: '', goal: '', where: '多店舗展開', effect: '' }], finalAnswer: '',
    }
    const r = scoreByRubric(bad)
    expect(r.total).toBeLessThan(40)
    expect(r.criteria.find((c) => c.id === 'measures')!.feedback).toContain('不可')
  })

  it('GHOST はパターン節のデータ（質疑なし）、GOD は完全解', () => {
    const g = buildModelView(CONBINI_STUDENTS[3], 'GHOST')
    const d = buildModelView(CONBINI_STUDENTS[3], 'GOD')
    expect(g.ws.sheets[0].tree.nodes).not.toEqual(d.ws.sheets[0].tree.nodes)
    expect(Object.keys(g.nodeQa)).toHaveLength(0)
    expect(Object.keys(d.nodeQa).length).toBeGreaterThan(0)
    expect(JSON.stringify({ ...g, student: null })).not.toContain('〔質疑')
  })

  it('WARRANT の理由は原文が述べるときだけ（GOD4 は Impact◎・コスト○）', () => {
    const w4 = buildModelView(CONBINI_STUDENTS[3], 'GOD').why
    expect(w4[0].role).toBe('main')
    expect(w4[0].reason.startsWith('Impact◎・コスト○')).toBe(true)
    expect(w4.filter((r) => r.reason)).toHaveLength(2)
    for (const st of CONBINI_STUDENTS) for (const r of buildModelView(st, 'GHOST').why) expect(r.reason).not.toContain('〔質疑')
    expect(buildModelView(CONBINI_STUDENTS[2], 'GOD').why[0].reason).toContain('最優先')
  })

  it('理由の採点：メインに効果・コスト・時間などの理由があれば満点', () => {
    const v = buildModelView(CONBINI_STUDENTS[3], 'GOD')
    const base = scoreInputFromModel('conbini', v)
    const key = Object.entries(v.ws.sheets[0].measures).flatMap(([nid, l]) => l.map((m) => `${v.ws.sheets[0].id}/${nid}/${m.id}`))
    const main = key.find((k) => v.why.find((r) => r.key === k)?.role === 'main')!
    const good = scoreByRubric({ ...base, warrant: { version: 2, roles: { [main]: 'main' }, reasons: { [main]: 'コストが低くすぐ始められ、効果が大きい' }, finalAnswer: '' }, pitches: base.pitches.map((p, i) => ({ ...p, measureKey: i === 0 ? main : undefined })) })
    const ev = good.criteria.find((c) => c.id === 'evaluation')!
    expect(ev.score).toBe(ev.max)
    const none = scoreByRubric({ ...base, warrant: { version: 2, roles: {}, reasons: {}, finalAnswer: '' } })
    expect(none.criteria.find((c) => c.id === 'evaluation')!.score).toBe(0)
  })

  it('最優先の明示がある施策は REPORT のメイン（GOD 2/3/4）', () => {
    for (const i of [1, 2, 3]) expect(buildModelView(CONBINI_STUDENTS[i], 'GOD').pitches[0].role).toBe('メイン')
    for (const st of CONBINI_STUDENTS) expect(buildModelView(st, 'GHOST').pitches.every((p) => !p.role)).toBe(true)
  })

  it('突っ込みパターンから CAPTAIN の問いを足す', () => {
    const r = withCaseChallenge({ severity: 'ok', lines: ['a'] }, getIdeal('conbini'), 3)
    expect(r.lines).toHaveLength(2)
    expect(r.lines[1]).toContain('前提への反証')
    expect(withCaseChallenge({ severity: 'ok', lines: ['a'] }, getIdeal('local-dept'), 3).lines).toHaveLength(1)
  })
})
