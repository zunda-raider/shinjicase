import { describe, expect, it } from 'vitest'
import { MARUYAMA_STUDENTS } from '../data/models/maruyama'
import { buildModelView } from '../logic/modelView'
import { createTree, decompose } from '../logic/evidenceTree'
import { addMeasure, newSheet } from '../logic/workspace'
import { scoreByRubric, scoreInputFromModel, type ScoreInput } from './rubricScorer'

const score = (no: number, mode: 'GHOST' | 'GOD') =>
  scoreByRubric(scoreInputFromModel('local-dept', buildModelView(MARUYAMA_STUDENTS[no - 1], mode)))

function badInput(): ScoreInput {
  const t = decompose(createTree('売上'), 'root', 'mul', ['値引き', '広告']).tree
  let ws = { version: 4 as const, seq: 1, activeSheetId: 's1', sheets: [newSheet('s1', '切り口1', t)] }
  ws = addMeasure(ws, 's1', 'n1', '値引きする').ws
  return {
    caseId: 'local-dept',
    premises: [],
    numericTarget: false,
    years: 0,
    ws,
    pins: [],
    motives: {},
    warrant: null,
    pitches: [{ premise: '', current: '', goal: '', where: '値引き', effect: '' }],
    finalAnswer: '',
  }
}

describe('rubricScorer（まるやま模範で検証）', () => {
  it('◎ の生徒（1・5）の GOD は高得点', () => {
    for (const no of [1, 5]) {
      const r = score(no, 'GOD')
      expect(r.total).toBeGreaterThanOrEqual(85)
      expect(['S', 'A']).toContain(r.grade)
      expect(r.reach).toBe('◎')
    }
  })

  it('△ の生徒（2・3）の GHOST は中程度', () => {
    for (const no of [2, 3]) {
      const r = score(no, 'GHOST')
      expect(r.total).toBeGreaterThanOrEqual(50)
      expect(r.total).toBeLessThanOrEqual(70)
      expect(r.reach).toBe('△')
    }
  })

  it('GOD は同じ生徒の GHOST 以上', () => {
    for (let no = 1; no <= 6; no++) expect(score(no, 'GOD').total).toBeGreaterThanOrEqual(score(no, 'GHOST').total)
  })

  it('値引き中心・ピンなし・前提なしは低得点', () => {
    const r = scoreByRubric(badInput())
    expect(r.total).toBeLessThan(40)
    expect(r.criteria.find((c) => c.id === 'measures')!.feedback).toContain('不可')
  })

  it('6項目・決定的・近い生徒を返す', () => {
    const r = score(5, 'GOD')
    expect(r.criteria.map((c) => c.max).reduce((a, b) => a + b)).toBe(100)
    expect(score(5, 'GOD').total).toBe(r.total)
    expect(r.closest?.no).toBe(5)
    expect(score(1, 'GOD').closest?.no).toBe(1)
  })

  it('スコア表', () => {
    const rows = [1, 2, 3, 4, 5, 6].flatMap((no) =>
      (['GHOST', 'GOD'] as const).map((m) => {
        const r = score(no, m)
        return `${no} ${m} ${r.total} ${r.grade} ${r.reach} 近:${r.closest?.no} ` + r.criteria.map((c) => `${c.id}=${c.score}`).join(' ')
      }),
    )
    const b = scoreByRubric(badInput())
    rows.push(`bad ${b.total} ${b.grade} ` + b.criteria.map((c) => `${c.id}=${c.score}`).join(' '))
    console.log(rows.join('\n'))
  })
})
