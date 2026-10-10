import { TREE_SIZE_NORMAL } from '../logic/evidenceTree'
import type { TreeSize } from '../logic/evidenceTree'
import type { EvidenceTree, TreeLayout } from '../types'

interface Props {
  tree: EvidenceTree
  layout: TreeLayout
  size?: TreeSize
}

/** 親 → 子の段をつなぐ赤い糸（SVG） */
export function TreeThreads({ tree, layout, size = TREE_SIZE_NORMAL }: Props) {
  const { cardW, cardH, vGap } = size
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
        const px = p.x + cardW / 2
        const midY = p.y + cardH + vGap / 2
        const xs = kids.map((c) => layout.positions[c].x + cardW / 2)
        const childTop = layout.positions[kids[0]].y
        const d = [
          `M ${px} ${p.y + cardH} V ${midY}`,
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
