import { describe, expect, it } from 'vitest'
import { SAMPLE_CASES } from '../data/cases'
import { getModelStudents } from '../data/models'
import { factCardFromLine } from '../data/models/factCards'
import { CARD_H, CARD_W, layoutTree } from './evidenceTree'
import { buildModelView } from './modelView'
import { overlaps, placeFactCards, type Rect } from './boardNotes'

describe('placeFactCards（全事件・全模範）', () => {
  it('カードはツリーの下にあり、互いにもノードにも重ならない', () => {
    let checked = 0
    for (const c of SAMPLE_CASES) {
      for (const st of getModelStudents(c.id)) {
        for (const mode of ['GHOST', 'GOD'] as const) {
          const v = buildModelView(st, mode)
          for (const sheet of v.ws.sheets) {
            const layout = layoutTree(sheet.tree)
            for (const mode of ['below', 'right'] as const) {
            const pl = placeFactCards(layout, v.factCards, 0, mode)
            const nodes: Rect[] = Object.values(layout.positions).map((p) => ({ x: p.x, y: p.y, w: CARD_W, h: CARD_H }))
            for (const [i, a] of pl.cards.entries()) {
              if (mode === 'below') expect(a.y).toBeGreaterThanOrEqual(layout.height)
              else expect(a.x).toBeGreaterThanOrEqual(layout.width)
              for (const b of pl.cards.slice(i + 1)) expect(overlaps(a, b)).toBe(false)
              for (const n of nodes) expect(overlaps(a, n)).toBe(false)
              expect(a.y + a.h).toBeLessThanOrEqual(pl.height)
              expect(a.x + a.w).toBeLessThanOrEqual(pl.width)
            }
            checked++
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('模範のカードは短い・GHOST は質疑カードを含まない', () => {
    for (const st of [...getModelStudents('local-dept'), ...getModelStudents('conbini')]) {
      for (const card of [...st.factCards, ...(st.ghost?.factCards ?? [])]) expect([...card.text].length).toBeLessThanOrEqual(30)
      expect(buildModelView(st, 'GHOST').factCards.some((x) => x.qa)).toBe(false)
    }
  })

  it('先頭ラベルで色カテゴリを選ぶ', () => {
    expect(factCardFromLine('競合：SPA・EC').category).toBe('競合')
    expect(factCardFromLine('人口が減っている').category).toBe('その他')
    expect(factCardFromLine('収支：赤字').category).toBe('収支')
  })
})
