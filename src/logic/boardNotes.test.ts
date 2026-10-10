import { describe, expect, it } from 'vitest'
import { SAMPLE_CASES } from '../data/cases'
import { getModelStudents } from '../data/models'
import { CARD_H, CARD_W, layoutTree } from './evidenceTree'
import { buildModelView } from './modelView'
import { overlaps, placeBoardNotes, type Rect } from './boardNotes'

describe('placeBoardNotes（全事件・全模範）', () => {
  it('事実メモ・現状カードは互いにもノードにも重ならない', () => {
    let checked = 0
    for (const c of SAMPLE_CASES) {
      for (const st of getModelStudents(c.id)) {
        for (const mode of ['GHOST', 'GOD'] as const) {
          const v = buildModelView(st, mode)
          for (const sheet of v.ws.sheets) {
            const layout = layoutTree(sheet.tree)
            const pl = placeBoardNotes(layout, [
              { key: 'fact', kind: 'fact', lines: v.facts },
              { key: 'genjo', kind: 'genjo', lines: v.current.filter((x) => !v.facts.includes(x)) },
            ])
            const nodes: Rect[] = Object.values(layout.positions).map((p) => ({
              x: p.x + pl.treeX,
              y: p.y,
              w: CARD_W,
              h: CARD_H,
            }))
            for (const [i, a] of pl.notes.entries()) {
              for (const b of pl.notes.slice(i + 1)) expect(overlaps(a, b)).toBe(false)
              for (const n of nodes) expect(overlaps(a, n)).toBe(false)
              expect(a.y + a.h).toBeLessThanOrEqual(pl.height)
              expect(a.x + a.w).toBeLessThanOrEqual(pl.width)
            }
            checked++
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('メモがなければツリーはずれない', () => {
    const v = buildModelView(getModelStudents('local-dept')[0], 'GHOST')
    const L = layoutTree(v.ws.sheets[0].tree)
    expect(placeBoardNotes(L, []).treeX).toBe(0)
  })
})
