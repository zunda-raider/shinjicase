import { describe, expect, it } from 'vitest'
import { SAMPLE_CASE } from '../data/case'
import { REVISE_BONUS, baseScore, evaluateSubmission } from './captain'

describe('evaluateSubmission', () => {
  it('flags empty motives', () => {
    const result = evaluateSubmission(
      [{ candidateId: 'pricing', motive: '' }],
      SAMPLE_CASE,
    )
    expect(result.severity).toBe('empty')
    expect(result.lines.length).toBeGreaterThanOrEqual(1)
  })

  it('flags weak short motives', () => {
    const result = evaluateSubmission(
      [{ candidateId: 'pricing', motive: '高い' }],
      SAMPLE_CASE,
    )
    expect(result.severity).toBe('weak')
  })

  it('flags non-ideal count when motives are ok', () => {
    const result = evaluateSubmission(
      [
        {
          candidateId: 'pricing',
          motive: '競合比で常に割高で反応も遅い',
        },
      ],
      SAMPLE_CASE,
    )
    expect(result.severity).toBe('count')
  })

  it('returns ok for ideal count with solid motives', () => {
    const result = evaluateSubmission(
      [
        { candidateId: 'pricing', motive: '競合比で常に割高で反応も遅い' },
        { candidateId: 'competitor', motive: '近隣セルフ店への価格流出が主因' },
        { candidateId: 'ops', motive: '接客省略で口コミ評価が急落している' },
      ],
      SAMPLE_CASE,
    )
    expect(result.severity).toBe('ok')
  })
})

describe('baseScore / revise bonus', () => {
  it('scores pinned suspects with motives', () => {
    const score = baseScore(
      [
        { candidateId: 'pricing', motive: '競合比で常に割高で反応も遅い' },
        { candidateId: 'competitor', motive: '近隣セルフ店への価格流出が主因' },
        { candidateId: 'ops', motive: '接客省略で口コミ評価が急落している' },
      ],
      SAMPLE_CASE,
    )
    expect(score).toBeGreaterThan(0)
    expect(REVISE_BONUS).toBe(25)
  })
})
