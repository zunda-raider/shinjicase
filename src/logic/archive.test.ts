import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { highlightQa, splitArchive, splitGodTitle } from './archive'
import { getIdeal } from '../data/ideals'
import { rubricHits } from '../scoring/offlineScorer'
import type { ScorePacket } from './report'

const md = readFileSync(new URL('../data/archive/maruyama-department-store.md', import.meta.url), 'utf8')

describe('archive', () => {
  it('splits GHOST and 6 GOD answers', () => {
    const a = splitArchive(md)
    expect(a.title).toContain('地方百貨店')
    expect(a.ghost).toContain('## 必須の要素')
    expect(a.ghost).toContain('不可とするもの')
    expect(a.ghost).not.toContain('完全解1')
    expect(a.god).toHaveLength(6)
    expect(splitGodTitle(a.god[0].title)).toEqual({ no: '完全解1', name: '食品・ギフト・外商に集中' })
    expect(a.god[5].body).toContain('百貨店ならではの勝ち筋')
    expect(a.godNote).toContain('hot_spots')
  })

  it('highlights 〔質疑n〕 tags', () => {
    expect(highlightQa('体験価値〔質疑4〕と〔質疑1・2〕')).toBe(
      '体験価値<span class="qa-chip">質疑4</span>と<span class="qa-chip">質疑1・2</span>',
    )
  })
})

describe('maruyama ideal rubric', () => {
  it('has two lineages and rejected list', () => {
    const r = getIdeal('local-dept')!
    expect(r.hotSpots.map((h) => h.name)).toEqual(['客単価を深掘りする', '来店の理由を作る'])
    expect(r.requiredElements).toHaveLength(5)
    expect(r.acceptedFirstDecompositions).toHaveLength(5)
    expect(r.rejected).toHaveLength(3)
    expect(getIdeal('blue-oasis')).toBeNull()
  })

  it('offline keyword hits: lineage bonus, rejected penalty', () => {
    const base = {
      pitches: [],
      allMeasures: [{ text: '外商でギフトと法人需要を取る' }],
      warrantFinalAnswer: '',
      rubric: getIdeal('local-dept')!,
    } as unknown as ScorePacket
    const ok = rubricHits(base)
    expect(ok.lineage).toBe('客単価を深掘りする')
    expect(ok.bonus).toBe(3)
    const bad = rubricHits({ ...base, warrantFinalAnswer: '値引きで集客' })
    expect(bad.rejected).toEqual(['値引きを中心に据える'])
  })
})
