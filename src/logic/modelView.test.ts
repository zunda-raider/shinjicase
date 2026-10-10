import { describe, expect, it } from 'vitest'
import { MARUYAMA_STUDENTS } from '../data/models/maruyama'
import { getModelStudents } from '../data/models'
import { buildModelView, modeText } from './modelView'
import { collectMeasures } from './warrant'

function allText(v: ReturnType<typeof buildModelView>): string {
  return JSON.stringify([v.ws, v.premises, v.current, v.notes, v.pitches, v.focus, v.intake])
}

describe('modelView', () => {
  it('6人分ある（まるやま百貨店のみ）', () => {
    expect(getModelStudents('local-dept')).toHaveLength(6)
    expect(getModelStudents('blue-oasis')).toHaveLength(0)
  })

  it('modeText：GHOST は〔質疑〕つきの文を落とす', () => {
    const s = '黒字化。必要な増収を5〜10億円と置く〔質疑1〕'
    expect(modeText(s, 'GHOST')).toBe('黒字化。')
    expect(modeText(s, 'GOD')).toBe(s)
  })

  it('GHOST には〔質疑〕由来の文・ノード・切り口が一切ない', () => {
    for (const st of MARUYAMA_STUDENTS) {
      const v = buildModelView(st, 'GHOST')
      expect(allText(v)).not.toMatch(/質疑/)
      expect(Object.keys(v.nodeQa)).toHaveLength(0)
      expect(Object.keys(v.sheetQa)).toHaveLength(0)
    }
    const g1 = buildModelView(MARUYAMA_STUDENTS[0], 'GHOST')
    expect(g1.ws.sheets.map((s) => s.name)).toEqual(['店頭＋外商＋ギフト＋催事'])
  })

  it('GOD は〔質疑〕部分を含み、施策は原文どおり全件', () => {
    for (const st of MARUYAMA_STUDENTS) {
      const v = buildModelView(st, 'GOD')
      expect(collectMeasures(v.ws, v.pins)).toHaveLength(st.measures.length)
      expect(v.pins.length).toBeLessThanOrEqual(3)
      expect(buildModelView(st, 'GHOST').pins.length).toBeLessThanOrEqual(3)
    }
    const v2 = buildModelView(MARUYAMA_STUDENTS[1], 'GOD')
    const labels = Object.values(v2.ws.sheets[1].tree.nodes).map((n) => n.label)
    expect(labels).toContain('純増する4つのカテゴリ')
    expect(Object.values(v2.nodeQa)).toContain('質疑3')
    const g2 = buildModelView(MARUYAMA_STUDENTS[1], 'GHOST')
    const glabels = Object.values(g2.ws.sheets[1].tree.nodes).map((n) => n.label)
    expect(glabels).not.toContain('純増する4つのカテゴリ')
    expect(g2.pins).toHaveLength(0)
  })

  it('評点は作らない（WARRANT は記載なし）・元データを書き換えない', () => {
    const before = JSON.stringify(MARUYAMA_STUDENTS)
    for (const st of MARUYAMA_STUDENTS) {
      buildModelView(st, 'GOD')
      buildModelView(st, 'GHOST')
    }
    expect(JSON.stringify(MARUYAMA_STUDENTS)).toBe(before)
    expect(buildModelView(MARUYAMA_STUDENTS[0], 'GOD')).not.toHaveProperty('warrant')
  })

  it('生徒ごとに別の内容', () => {
    const a = buildModelView(MARUYAMA_STUDENTS[0], 'GOD')
    const b = buildModelView(MARUYAMA_STUDENTS[3], 'GOD')
    expect(a.ws.sheets[0].name).not.toBe(b.ws.sheets[0].name)
    expect(b.estimates).toEqual({})
    expect(Object.values(a.estimates)).toContain('＋8')
  })
})
