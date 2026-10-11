import { describe, expect, it } from 'vitest'
import {
  SAMPLE_CASES,
  applySampleSuspects,
  getCase,
  DEFAULT_CASE_ID,
} from './cases'
import { caseStorageKey, dropStaleKeys, loadActiveCaseId } from '../logic/caseStorage'

describe('sample cases', () => {
  it('every case has a short お題, statement without targets, and an example tree', () => {
    for (const c of SAMPLE_CASES) {
      expect(c.odai.length).toBeLessThanOrEqual(30)
      expect(c.intake.statement ?? '').not.toMatch(/倍|％|%/)
      const ws = c.buildExample()
      expect(ws.sheets.length).toBeGreaterThanOrEqual(1)
      expect(Object.keys(ws.sheets[0].tree.nodes).length).toBeGreaterThan(3)
      expect(applySampleSuspects(c, ws).pins.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('registers only まるやま百貨店 and コンビニ', () => {
    expect(SAMPLE_CASES.map((c) => c.id)).toEqual(['local-dept', 'conbini'])
    expect(DEFAULT_CASE_ID).toBe('local-dept')
    expect(getCase('blue-oasis').id).toBe('local-dept')
  })

  it('applySampleSuspects pins labeled nodes', () => {
    const c = getCase('conbini')
    const { pins, motives } = applySampleSuspects(c, c.buildExample())
    expect(pins.length).toBe(1)
    expect(Object.keys(motives)).toHaveLength(1)
  })

  it('namespaces storage keys per case', () => {
    expect(caseStorageKey('conbini', 'evidence')).toBe('shinjicase.case.conbini.evidence.v4')
  })

  it('drops storage of removed cases and legacy keys, keeps registered ones', () => {
    const m = new Map<string, string>()
    globalThis.localStorage = {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
      clear: () => m.clear(),
      key: (i: number) => [...m.keys()][i] ?? null,
      get length() {
        return m.size
      },
    } as Storage
    localStorage.setItem('shinjicase.case.blue-oasis.evidence.v4', '{}')
    localStorage.setItem('shinjicase.case.conbini.evidence.v4', '{}')
    localStorage.setItem('shinjicase.activeCase', 'blue-oasis')
    dropStaleKeys()
    expect(localStorage.getItem('shinjicase.case.blue-oasis.evidence.v4')).toBeNull()
    expect(localStorage.getItem('shinjicase.case.conbini.evidence.v4')).toBe('{}')
    expect(loadActiveCaseId()).toBe('local-dept')
  })
})
