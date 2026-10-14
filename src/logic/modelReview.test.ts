import { describe, expect, it } from 'vitest'
import { getIdeal } from '../data/ideals'
import { getModelStudents } from '../data/models'
import { buildModelReview } from './modelReview'

describe('buildModelReview', () => {
  it('GOD includes 〔質疑〕 excerpts; GHOST does not invent praise', () => {
    const ideal = getIdeal('local-dept')
    const st = getModelStudents('local-dept')[0]
    const god = buildModelReview(st, 'GOD', ideal)
    expect(god.title).toContain('食品')
    expect(god.focus.length).toBeGreaterThan(0)
    expect(god.qaAdded.length).toBeGreaterThan(0)
    expect(god.passMap.some((p) => p.name === '前提')).toBe(true)
    expect(god.lineage?.name).toBeTruthy()
    const ghost = buildModelReview(st, 'GHOST', ideal)
    expect(ghost.qaAdded).toEqual([])
    expect(ghost.reach?.grade).toBe('◎')
  })

  it('コンビニ GOD 講評 has qa and pass map without score UI fields', () => {
    const r = buildModelReview(getModelStudents('conbini')[1], 'GOD', getIdeal('conbini'))
    expect(r.title).toBeTruthy()
    expect(r.passMap.length).toBeGreaterThan(0)
    expect(JSON.stringify(r)).not.toMatch(/"total"/)
    expect(r.qaAdded.length).toBeGreaterThan(0)
  })
})
