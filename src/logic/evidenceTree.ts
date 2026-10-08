import type {
  Candidate,
  EvidenceLink,
  EvidenceNode,
  EvidenceNodeId,
  EvidenceTree,
  LinkKind,
  MechanismTag,
} from '../types'

/** カードの描画サイズ（糸の端点計算と移動の範囲制限に使う） */
export const CARD_W = 160
export const CARD_H = 64
export const BOARD_W = 1600
export const BOARD_H = 900

export const ROOT_ID = 'root'

export const LINK_SYMBOL: Record<LinkKind, string> = { mul: '×', add: '＋' }
export const LINK_LABEL: Record<LinkKind, string> = { mul: '仕組み', add: '内訳' }
export const TAG_LABEL: Record<MechanismTag, string> = {
  increase: '増減',
  production: '生産',
  conversion: '転換',
}
const TAG_ORDER: (MechanismTag | undefined)[] = [
  undefined,
  'increase',
  'production',
  'conversion',
]

/** ⅰ で決めた指標をルートの黒カードとして置いたツリーを作る */
export function createTree(rootLabel: string): EvidenceTree {
  return {
    rootId: ROOT_ID,
    seq: 0,
    nodes: {
      [ROOT_ID]: {
        id: ROOT_ID,
        label: rootLabel,
        x: 40,
        y: 260,
        parentId: null,
      },
    },
  }
}

export function clampPos(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.round(Math.min(Math.max(0, x), BOARD_W - CARD_W)),
    y: Math.round(Math.min(Math.max(0, y), BOARD_H - CARD_H)),
  }
}

/** 糸を引き出して子カード（空欄）を作る。新しい id も返す。 */
export function addChild(
  tree: EvidenceTree,
  parentId: EvidenceNodeId,
  pos: { x: number; y: number },
  kind: LinkKind = 'mul',
  label = '',
): { tree: EvidenceTree; id: EvidenceNodeId } {
  if (!tree.nodes[parentId]) return { tree, id: '' }
  const seq = tree.seq + 1
  const id = `n${seq}`
  const { x, y } = clampPos(pos.x, pos.y)
  const node: EvidenceNode = { id, label, x, y, parentId, link: { kind } }
  return {
    id,
    tree: { ...tree, seq, nodes: { ...tree.nodes, [id]: node } },
  }
}

/** 糸を短く引いた（クリックした）ときの自動配置：親の右、兄弟の下 */
export function suggestChildPos(
  tree: EvidenceTree,
  parentId: EvidenceNodeId,
): { x: number; y: number } {
  const parent = tree.nodes[parentId]
  if (!parent) return { x: 0, y: 0 }
  const siblings = childrenOf(tree, parentId)
  const x = parent.x + CARD_W + 80
  const y =
    siblings.length === 0
      ? parent.y
      : Math.max(...siblings.map((s) => s.y)) + CARD_H + 24
  return clampPos(x, y)
}

export function renameNode(
  tree: EvidenceTree,
  id: EvidenceNodeId,
  label: string,
): EvidenceTree {
  const node = tree.nodes[id]
  if (!node) return tree
  return { ...tree, nodes: { ...tree.nodes, [id]: { ...node, label } } }
}

export function moveNode(
  tree: EvidenceTree,
  id: EvidenceNodeId,
  pos: { x: number; y: number },
): EvidenceTree {
  const node = tree.nodes[id]
  if (!node) return tree
  const { x, y } = clampPos(pos.x, pos.y)
  if (node.x === x && node.y === y) return tree
  return { ...tree, nodes: { ...tree.nodes, [id]: { ...node, x, y } } }
}

export function childrenOf(tree: EvidenceTree, id: EvidenceNodeId): EvidenceNode[] {
  return Object.values(tree.nodes).filter((n) => n.parentId === id)
}

/** id 自身とその子孫すべての id */
export function subtreeIds(tree: EvidenceTree, id: EvidenceNodeId): EvidenceNodeId[] {
  if (!tree.nodes[id]) return []
  const out: EvidenceNodeId[] = []
  const stack = [id]
  while (stack.length) {
    const cur = stack.pop()!
    out.push(cur)
    for (const c of childrenOf(tree, cur)) stack.push(c.id)
  }
  return out
}

/** カードと子孫をまとめて削除（ルートは消せない） */
export function removeSubtree(tree: EvidenceTree, id: EvidenceNodeId): EvidenceTree {
  if (id === tree.rootId || !tree.nodes[id]) return tree
  const drop = new Set(subtreeIds(tree, id))
  const nodes: EvidenceTree['nodes'] = {}
  for (const [k, v] of Object.entries(tree.nodes)) {
    if (!drop.has(k)) nodes[k] = v
  }
  return { ...tree, nodes }
}

function updateLink(
  tree: EvidenceTree,
  id: EvidenceNodeId,
  fn: (l: EvidenceLink) => EvidenceLink,
): EvidenceTree {
  const node = tree.nodes[id]
  if (!node || !node.link) return tree
  return {
    ...tree,
    nodes: { ...tree.nodes, [id]: { ...node, link: fn(node.link) } },
  }
}

/** 糸のバッジ × ⇄ ＋ を切り替える（＋にしたらタグは外す） */
export function toggleLinkKind(tree: EvidenceTree, id: EvidenceNodeId): EvidenceTree {
  return updateLink(tree, id, (l) =>
    l.kind === 'mul' ? { kind: 'add' } : { kind: 'mul' },
  )
}

/** × の糸のタグを なし → 増減 → 生産 → 転換 → なし と回す */
export function cycleLinkTag(tree: EvidenceTree, id: EvidenceNodeId): EvidenceTree {
  return updateLink(tree, id, (l) => {
    if (l.kind !== 'mul') return l
    const i = TAG_ORDER.indexOf(l.tag)
    const next = TAG_ORDER[(i + 1) % TAG_ORDER.length]
    return next ? { kind: 'mul', tag: next } : { kind: 'mul' }
  })
}

/** ルートからのパス（ラベル列） */
export function pathLabels(tree: EvidenceTree, id: EvidenceNodeId): string[] {
  const out: string[] = []
  let cur: EvidenceNode | undefined = tree.nodes[id]
  let guard = 0
  while (cur && guard++ < 1000) {
    out.unshift(cur.label.trim() || '（未記入）')
    cur = cur.parentId ? tree.nodes[cur.parentId] : undefined
  }
  return out
}

/**
 * ⅲ PRIME SUSPECT 用の候補カードに変換する。
 * ルート以外で名前が入っているカードが対象。葉（末端）を先に並べる。
 */
export function treeToCandidates(tree: EvidenceTree): Candidate[] {
  const nodes = Object.values(tree.nodes).filter(
    (n) => n.id !== tree.rootId && n.label.trim() !== '',
  )
  const isLeaf = (n: EvidenceNode) => childrenOf(tree, n.id).length === 0
  const sorted = [...nodes].sort((a, b) => {
    const la = isLeaf(a) ? 0 : 1
    const lb = isLeaf(b) ? 0 : 1
    if (la !== lb) return la - lb
    return a.y - b.y || a.x - b.x
  })
  return sorted.map((n) => {
    const link = n.link
    const linkText = link
      ? `${LINK_SYMBOL[link.kind]} ${LINK_LABEL[link.kind]}${link.tag ? `・${TAG_LABEL[link.tag]}` : ''}`
      : ''
    return {
      id: n.id,
      title: n.label.trim(),
      summary: `経路：${pathLabels(tree, n.id).join(' › ')}`,
      category: `${isLeaf(n) ? '末端' : '中間'} ${linkText}`.trim(),
    }
  })
}

/** localStorage から読んだ値が使える形か軽くチェック */
export function isEvidenceTree(v: unknown): v is EvidenceTree {
  if (!v || typeof v !== 'object') return false
  const t = v as Partial<EvidenceTree>
  if (typeof t.rootId !== 'string' || typeof t.seq !== 'number') return false
  if (!t.nodes || typeof t.nodes !== 'object') return false
  const root = (t.nodes as Record<string, EvidenceNode>)[t.rootId]
  return !!root && typeof root.label === 'string'
}
