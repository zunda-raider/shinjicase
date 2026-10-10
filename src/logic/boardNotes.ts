import type { FactCard } from '../data/models/factCards'
import type { TreeLayout } from '../types'

/*
 * EVIDENCE ボードの事実・現状カードの配置（全事件・全模範で同じルール）。
 * ツリーを上に置き、その下に固定サイズのカードを折り返して並べる。
 * カードはツリーの外接矩形より下にしか置かないので、ノードとは重ならない。
 */

export const FACT_W = 176
export const FACT_H = 40
export const FACT_GAP = 8
export const FACT_PAD = 12
const MIN_W = 4 * (FACT_W + FACT_GAP) + FACT_PAD * 2

export interface PlacedCard extends FactCard {
  key: string
  x: number
  y: number
  w: number
  h: number
}

export interface BoardPlacement {
  cards: PlacedCard[]
  width: number
  height: number
}

export function placeFactCards(layout: TreeLayout, cards: FactCard[], extraBottom = 0): BoardPlacement {
  const treeH = layout.height + extraBottom
  if (!cards.length) return { cards: [], width: layout.width, height: treeH }
  const width = Math.max(layout.width, MIN_W)
  const perRow = Math.max(1, Math.floor((width - FACT_PAD * 2 + FACT_GAP) / (FACT_W + FACT_GAP)))
  const top = treeH + FACT_GAP
  const placed = cards.map((c, i) => ({
    ...c,
    key: `${i}-${c.text}`,
    x: FACT_PAD + (i % perRow) * (FACT_W + FACT_GAP),
    y: top + Math.floor(i / perRow) * (FACT_H + FACT_GAP),
    w: FACT_W,
    h: FACT_H,
  }))
  const rows = Math.ceil(cards.length / perRow)
  return { cards: placed, width, height: top + rows * (FACT_H + FACT_GAP) + FACT_PAD }
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}
