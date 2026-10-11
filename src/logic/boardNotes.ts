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
  /** ツリーの左端 */
  treeX: number
  width: number
  height: number
}

/**
 * 'below'：ツリーの下に折り返して並べる。'right'：ツリーの右の空き列に縦に並べる（列は高さに収まるだけ増やす）。
 * どちらもツリーの外接矩形の外にしか置かないので、ノードとは重ならない。
 */
export function placeFactCards(
  layout: TreeLayout,
  cards: FactCard[],
  extraBottom = 0,
  mode: 'below' | 'right' = 'below',
): BoardPlacement {
  const treeH = layout.height + extraBottom
  if (!cards.length) return { cards: [], treeX: 0, width: layout.width, height: treeH }
  if (mode === 'right') {
    const perCol = Math.max(1, Math.floor((treeH - FACT_PAD * 2 + FACT_GAP) / (FACT_H + FACT_GAP)))
    const cols = Math.ceil(cards.length / perCol)
    const x0 = layout.width + FACT_GAP
    const placed = cards.map((c, i) => ({
      ...c,
      key: `${i}-${c.text}`,
      x: x0 + Math.floor(i / perCol) * (FACT_W + FACT_GAP),
      y: FACT_PAD + (i % perCol) * (FACT_H + FACT_GAP),
      w: FACT_W,
      h: FACT_H,
    }))
    const rows = Math.min(perCol, cards.length)
    return {
      cards: placed,
      treeX: 0,
      width: x0 + cols * (FACT_W + FACT_GAP) + FACT_PAD,
      height: Math.max(treeH, FACT_PAD * 2 + rows * (FACT_H + FACT_GAP)),
    }
  }
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
  return { cards: placed, treeX: (width - layout.width) / 2, width, height: top + rows * (FACT_H + FACT_GAP) + FACT_PAD }
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

/** 使える領域の縦横比に合わせて、縮尺が大きくなる方の配置を選ぶ */
export function placeFactCardsFit(
  layout: TreeLayout,
  cards: FactCard[],
  extraBottom: number,
  box: { w: number; h: number },
): BoardPlacement & { scale: number } {
  const opts = (['below', 'right'] as const).map((m) => {
    const p = placeFactCards(layout, cards, extraBottom, m)
    return { ...p, scale: Math.min(1, box.w / p.width, box.h / p.height) }
  })
  return opts[1].scale > opts[0].scale + 0.001 ? opts[1] : opts[0]
}
