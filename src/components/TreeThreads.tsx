import { CARD_H, CARD_W, V_GAP } from '../logic/evidenceTree'
import type { EvidenceTree, TreeLayout } from '../types'

interface Props {
  tree: EvidenceTree
  layout: TreeLayout
}

/** 親 → 子の段をつなぐ赤い糸（SVG） */
export function TreeThreads({ tree, layout }: Props) {
  return (
    <svg
      className="evidence__threads"
      width={layout.width}
      height={layout.height}
      aria-hidden="true"
    >
      {Object.values(tree.nodes).map((n) => {
        const kids = n.children.filter((c) => layout.positions[c])
        const p = layout.positions[n.id]
        if (!p || kids.length === 0) return null
        const px = p.x + CARD_W / 2
        const midY = p.y + CARD_H + V_GAP / 2
        const xs = kids.map((c) => layout.positions[c].x + CARD_W / 2)
        const childTop = layout.positions[kids[0]].y
        const d = [
          `M ${px} ${p.y + CARD_H} V ${midY}`,
          `M ${Math.min(...xs, px)} ${midY} H ${Math.max(...xs, px)}`,
          ...xs.map((x) => `M ${x} ${midY} V ${childTop}`),
        ].join(' ')
        return (
          <path
            key={n.id}
            d={d}
            className={`evidence__thread evidence__thread--${n.split?.kind ?? 'mul'}`}
          />
        )
      })}
    </svg>
  )
}
