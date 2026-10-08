import { describe, expect, it } from 'vitest'
import type { CaseData } from '../types'
import { REVISE_BONUS, baseScore, evaluateSubmission } from './captain'

const CASE: CaseData = {
  id: 'fixture',
  title: 'fixture',
  briefing: '',
  idealPrimeCount: 3,
  candidates: ['pricing', 'competitor', 'ops', 'traffic'].map((id) => ({
    id,
    title: id,
    summary: '',
    category: '',
  })),
}

const SOLID = [
  { candidateId: 'pricing', motive: '競合比で常に割高で反応も遅い' },
  { candidateId: 'competitor', motive: '近隣セルフ店への価格流出が主因' },
  { candidateId: 'ops', motive: '接客省略で口コミ評価が急落している' },
]

describe('evaluateSubmission', () => {
  it('flags empty motives', () => {
    const result = evaluateSubmission([{ candidateId: 'pricing', motive: '' }], CASE)
    expect(result.severity).toBe('empty')
    expect(result.lines.length).toBeGreaterThanOrEqual(1)
  })

  it('flags weak short motives', () => {
    const result = evaluateSubmission([{ candidateId: 'pricing', motive: '高い' }], CASE)
    expect(result.severity).toBe('weak')
  })

  it('flags non-ideal count when motives are ok', () => {
    const result = evaluateSubmission([SOLID[0]], CASE)
    expect(result.severity).toBe('count')
  })

  it('returns ok for ideal count with solid motives', () => {
    expect(evaluateSubmission(SOLID, CASE).severity).toBe('ok')
  })
})

describe('baseScore / revise bonus', () => {
  it('scores pinned suspects with motives', () => {
    expect(baseScore(SOLID, CASE)).toBeGreaterThan(0)
    expect(REVISE_BONUS).toBe(25)
  })
})
