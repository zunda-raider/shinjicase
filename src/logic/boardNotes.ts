import type { TreeLayout } from '../types'

/*
 * ボード上のメモ（事実メモ・現状カード）の配置。
 * ツリーの左に専用の列を取り、上から間隔をあけて縦に積む。
 * ツリーはその列の右に置くので、メモとノードは構造的に重ならない。
 * 列が高ければキャンバスを下に伸ばす。どの事件・どの模範にも同じルール。
 */

export const NOTE_W = 210
export const NOTE_GAP = 8
export const NOTE_PAD = 10
const CHARS_PER_LINE = 17
const LINE_H = 15
const NOTE_INNER = 10

export interface BoardNote {
  key: string
  kind: 'fact' | 'genjo'
  lines: string[]
}

export interface PlacedNote extends BoardNote {
  x: number
  y: number
  w: number
  h: number
}

export interface BoardPlacement {
  notes: PlacedNote[]
  /** ツリーをずらす量 */
  treeX: number
  width: number
  height: number
}

export function noteHeight(lines: string[]): number {
  const rows = lines.reduce((a, t) => a + Math.max(1, Math.ceil([...t].length / CHARS_PER_LINE)), 0)
  return rows * LINE_H + NOTE_INNER + 14 /* 見出し */
}

export function placeBoardNotes(layout: TreeLayout, items: BoardNote[], extraBottom = 0): BoardPlacement {
  const list = items.filter((n) => n.lines.length > 0)
  if (!list.length) return { notes: [], treeX: 0, width: layout.width, height: layout.height + extraBottom }
  let y = NOTE_PAD
  const notes = list.map((n) => {
    const h = noteHeight(n.lines)
    const p = { ...n, x: NOTE_PAD, y, w: NOTE_W, h }
    y += h + NOTE_GAP
    return p
  })
  const treeX = NOTE_PAD + NOTE_W + NOTE_GAP
  return {
    notes,
    treeX,
    width: treeX + layout.width,
    height: Math.max(layout.height + extraBottom, y + NOTE_PAD),
  }
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
