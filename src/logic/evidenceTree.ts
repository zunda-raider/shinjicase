import type {
  NodeKind,
  Candidate,
  EvidenceNode,
  EvidenceNodeId,
  EvidenceTree,
  LinkKind,
  MechanismTag,
  Split,
  TreeLayout,
} from '../types'

/* ------------------------------------------------------------------ */
/* 定数                                                                */
/* ------------------------------------------------------------------ */

export const CARD_W = 156
export const CARD_H = 56
/** 兄弟カードの間（演算子を置く幅） */
export const H_GAP = 20
/** 段と段の間 */
export const V_GAP = 30
export const PAD = 14

/** ツリー描画サイズ（EVIDENCE＝通常、OPERATION＝約半分のコンパクト） */
export interface TreeSize {
  cardW: number
  cardH: number
  hGap: number
  vGap: number
  pad: number
}

export const TREE_SIZE_NORMAL: TreeSize = {
  cardW: CARD_W,
  cardH: CARD_H,
  hGap: H_GAP,
  vGap: V_GAP,
  pad: PAD,
}

/** OPERATION 左ペイン用。線寸法はだいたい半分、余白はそれ以上に詰める */
export const TREE_SIZE_COMPACT: TreeSize = {
  cardW: 78,
  cardH: 40,
  hGap: 20,
  vGap: 28,
  pad: 10,
}

/** OPERATION 左ペイン用（EVIDENCE の約70%） */
export const TREE_SIZE_OPERATION: TreeSize = {
  cardW: 96,
  cardH: 40,
  hGap: 24,
  vGap: 32,
  pad: 12,
}

export const ROOT_ID = 'root'
export const MAX_PINS = 3

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

/* ------------------------------------------------------------------ */
/* 生成                                                                */
/* ------------------------------------------------------------------ */

/** ⅰ で決めた指標をルート（最上段の黒カード）に置いたツリー */
export function createTree(rootLabel: string): EvidenceTree {
  return {
    version: 2,
    rootId: ROOT_ID,
    seq: 0,
    nodes: {
      [ROOT_ID]: { id: ROOT_ID, label: rootLabel, parentId: null, children: [] },
    },
  }
}

/** 例：売上 = 顧客数 × 客単価、顧客数 = 既存顧客 ＋ 新規顧客 */
export function exampleTree(rootLabel = '売上'): EvidenceTree {
  let t = createTree(rootLabel)
  const r1 = decompose(t, t.rootId, 'mul', ['顧客数', '客単価'])
  t = r1.tree
  const r2 = decompose(t, r1.ids[0], 'add', ['既存顧客', '新規顧客'])
  return r2.tree
}

function newId(tree: EvidenceTree): { id: string; seq: number } {
  const seq = tree.seq + 1
  return { id: `n${seq}`, seq }
}

function patch(
  tree: EvidenceTree,
  id: EvidenceNodeId,
  fn: (n: EvidenceNode) => EvidenceNode,
): EvidenceTree {
  const node = tree.nodes[id]
  if (!node) return tree
  return { ...tree, nodes: { ...tree.nodes, [id]: fn(node) } }
}

/* ------------------------------------------------------------------ */
/* 分解・追加                                                          */
/* ------------------------------------------------------------------ */

/**
 * ノードを分解する（下の段を作る）。子がまだないノードだけが対象。
 * labels の数だけ子を作る（既定は空欄2枚：分解は2要素以上なので）。
 */
export function decompose(
  tree: EvidenceTree,
  id: EvidenceNodeId,
  kind: LinkKind,
  labels: string[] = ['', ''],
): { tree: EvidenceTree; ids: EvidenceNodeId[] } {
  const node = tree.nodes[id]
  if (!node || splitKids(tree, id).length > 0 || labels.length === 0) {
    return { tree, ids: [] }
  }
  let t = tree
  const ids: EvidenceNodeId[] = []
  for (const label of labels) {
    const { id: cid, seq } = newId(t)
    ids.push(cid)
    t = {
      ...t,
      seq,
      nodes: {
        ...t.nodes,
        [cid]: { id: cid, label, parentId: id, children: [], kind: 'split' },
      },
    }
  }
  t = patch(t, id, (n) => ({ ...n, children: [...ids, ...n.children], split: { kind } }))
  return { tree: t, ids }
}

/** 同じ分解に要素を足す（after の右隣。after 省略時は末尾） */
export function addChild(
  tree: EvidenceTree,
  parentId: EvidenceNodeId,
  label = '',
  after?: EvidenceNodeId,
): { tree: EvidenceTree; id: EvidenceNodeId } {
  const parent = tree.nodes[parentId]
  if (!parent) return { tree, id: '' }
  if (parent.children.length === 0) {
    const r = decompose(tree, parentId, 'mul', [label])
    return { tree: r.tree, id: r.ids[0] }
  }
  const { id, seq } = newId(tree)
  const children = [...parent.children]
  const at = after ? children.indexOf(after) : -1
  if (at >= 0) children.splice(at + 1, 0, id)
  else children.push(id)
  return {
    id,
    tree: {
      ...tree,
      seq,
      nodes: {
        ...tree.nodes,
        [id]: { id, label, parentId, children: [], kind: 'split' },
        [parentId]: { ...parent, children },
      },
    },
  }
}

/** 兄弟を右隣に追加（「＋要素を追加」/ Tab）。ルートには兄弟を作れない。 */
export function addSibling(
  tree: EvidenceTree,
  id: EvidenceNodeId,
  label = '',
): { tree: EvidenceTree; id: EvidenceNodeId } {
  const node = tree.nodes[id]
  if (!node || !node.parentId) return { tree, id: '' }
  if (nodeKind(node) === 'analysis') return addAnalysisChild(tree, node.parentId, label)
  return addChild(tree, node.parentId, label, id)
}

export function renameNode(
  tree: EvidenceTree,
  id: EvidenceNodeId,
  label: string,
): EvidenceTree {
  return patch(tree, id, (n) => ({ ...n, label }))
}

/** id 自身とその子孫すべての id（前順） */
export function subtreeIds(tree: EvidenceTree, id: EvidenceNodeId): EvidenceNodeId[] {
  const node = tree.nodes[id]
  if (!node) return []
  return [id, ...node.children.flatMap((c) => subtreeIds(tree, c))]
}

/** カードと子孫をまとめて削除（ルートは消せない）。最後の子が消えたら分解も解除。 */
export function removeSubtree(tree: EvidenceTree, id: EvidenceNodeId): EvidenceTree {
  const node = tree.nodes[id]
  if (!node || id === tree.rootId || !node.parentId) return tree
  const drop = new Set(subtreeIds(tree, id))
  const nodes: EvidenceTree['nodes'] = {}
  for (const [k, v] of Object.entries(tree.nodes)) {
    if (!drop.has(k)) nodes[k] = v
  }
  const parent = nodes[node.parentId]
  if (parent) {
    const children = parent.children.filter((c) => c !== id)
    nodes[parent.id] = { ...parent, children }
  }
  return dropEmptySplit({ ...tree, nodes }, node.parentId)
}

/* ------------------------------------------------------------------ */
/* ノードの種類（分解 / 分析・課題）                                   */
/* ------------------------------------------------------------------ */

export function nodeKind(n: EvidenceNode | undefined): NodeKind {
  return n?.kind ?? 'split'
}

/** 式に入る子（分解）だけ */
export function splitKids(tree: EvidenceTree, id: EvidenceNodeId): EvidenceNodeId[] {
  return (tree.nodes[id]?.children ?? []).filter((c) => tree.nodes[c] && nodeKind(tree.nodes[c]) === 'split')
}

/** 分解の子が無くなった親から演算子を外す */
function dropEmptySplit(tree: EvidenceTree, id: EvidenceNodeId): EvidenceTree {
  const n = tree.nodes[id]
  if (!n || !n.split || splitKids(tree, id).length > 0) return tree
  const { split: _drop, ...rest } = n
  void _drop
  return { ...tree, nodes: { ...tree.nodes, [id]: rest } }
}

/** 分析・課題の子を末尾に足す（式には入らない） */
export function addAnalysisChild(
  tree: EvidenceTree,
  parentId: EvidenceNodeId,
  label = '',
): { tree: EvidenceTree; id: EvidenceNodeId } {
  const parent = tree.nodes[parentId]
  if (!parent) return { tree, id: '' }
  const { id, seq } = newId(tree)
  return {
    id,
    tree: {
      ...tree,
      seq,
      nodes: {
        ...tree.nodes,
        [id]: { id, label, parentId, children: [], kind: 'analysis' },
        [parentId]: { ...parent, children: [...parent.children, id] },
      },
    },
  }
}

/** 分解 ⇄ 分析・課題 を切り替える（ルートは対象外） */
export function toggleNodeKind(tree: EvidenceTree, id: EvidenceNodeId): EvidenceTree {
  const n = tree.nodes[id]
  return setNodeKind(tree, id, nodeKind(n) === 'split' ? 'analysis' : 'split')
}

export function setNodeKind(tree: EvidenceTree, id: EvidenceNodeId, next: NodeKind): EvidenceTree {
  const n = tree.nodes[id]
  if (!n || !n.parentId) return tree
  let t = patch(tree, id, (x) => ({ ...x, kind: next }))
  const parent = t.nodes[n.parentId]
  if (next === 'split' && parent && !parent.split) t = patch(t, parent.id, (x) => ({ ...x, split: { kind: 'add' } }))
  return dropEmptySplit(t, n.parentId)
}

/** 旧データ：kind の無いノードを 'split' に */
export function withNodeKinds(tree: EvidenceTree): EvidenceTree {
  if (Object.values(tree.nodes).every((n) => n.kind)) return tree
  const nodes: EvidenceTree['nodes'] = {}
  for (const [k, n] of Object.entries(tree.nodes)) nodes[k] = n.kind ? n : { ...n, kind: 'split' }
  return { ...tree, nodes }
}

/* ------------------------------------------------------------------ */
/* 演算子（親の分け方）                                                */
/* ------------------------------------------------------------------ */

function patchSplit(
  tree: EvidenceTree,
  id: EvidenceNodeId,
  fn: (s: Split) => Split,
): EvidenceTree {
  const node = tree.nodes[id]
  if (!node?.split) return tree
  return patch(tree, id, (n) => ({ ...n, split: fn(n.split!) }))
}

/** 分解の演算子 × ⇄ ＋ を切り替える（＋にしたらタグは外す） */
export function toggleSplitKind(tree: EvidenceTree, id: EvidenceNodeId): EvidenceTree {
  return patchSplit(tree, id, (s) => (s.kind === 'mul' ? { kind: 'add' } : { kind: 'mul' }))
}

/** × の分解のタグを なし → 増減 → 生産 → 転換 → なし と回す */
export function cycleSplitTag(tree: EvidenceTree, id: EvidenceNodeId): EvidenceTree {
  return patchSplit(tree, id, (s) => {
    if (s.kind !== 'mul') return s
    const next = TAG_ORDER[(TAG_ORDER.indexOf(s.tag) + 1) % TAG_ORDER.length]
    return next ? { kind: 'mul', tag: next } : { kind: 'mul' }
  })
}

/** 「顧客数 × 客単価」のような式 */
export function splitFormula(tree: EvidenceTree, id: EvidenceNodeId): string {
  const node = tree.nodes[id]
  const kids = splitKids(tree, id)
  if (!node?.split || kids.length === 0) return ''
  const op = ` ${LINK_SYMBOL[node.split.kind]} `
  return kids
    .map((c) => tree.nodes[c]?.label.trim() || '？')
    .join(op)
}

/* ------------------------------------------------------------------ */
/* 自動レイアウト（部分木の幅ベース、上から下へ）                      */
/* ------------------------------------------------------------------ */

export function layoutTree(
  tree: EvidenceTree,
  size: TreeSize = TREE_SIZE_NORMAL,
): TreeLayout {
  const { cardW, cardH, hGap, vGap, pad } = size
  // 分解の子を左、分析・課題の子を右にまとめる
  const ordered = (ids: EvidenceNodeId[]) => {
    const live = ids.filter((c) => tree.nodes[c])
    return [
      ...live.filter((c) => nodeKind(tree.nodes[c]) === 'split'),
      ...live.filter((c) => nodeKind(tree.nodes[c]) === 'analysis'),
    ]
  }
  const widths: Record<string, number> = {}
  const measure = (id: string): number => {
    const n = tree.nodes[id]
    const kids = n ? ordered(n.children) : []
    const sum =
      kids.reduce((acc, c) => acc + measure(c), 0) + hGap * Math.max(0, kids.length - 1)
    widths[id] = Math.max(cardW, sum)
    return widths[id]
  }
  const rootW = measure(tree.rootId)

  const positions: TreeLayout['positions'] = {}
  const operators: TreeLayout['operators'] = []
  let maxDepth = 0
  const rowY = (d: number) => pad + d * (cardH + vGap)

  const place = (id: string, left: number, depth: number) => {
    const n = tree.nodes[id]
    if (!n) return
    maxDepth = Math.max(maxDepth, depth)
    const w = widths[id]
    positions[id] = { x: left + w / 2 - cardW / 2, y: rowY(depth) }
    const kids = ordered(n.children)
    if (kids.length === 0) return
    const total =
      kids.reduce((acc, c) => acc + widths[c], 0) + hGap * (kids.length - 1)
    let cursor = left + (w - total) / 2
    kids.forEach((c) => {
      place(c, cursor, depth + 1)
      cursor += widths[c] + hGap
    })
    for (let i = 0; i < kids.length - 1; i++) {
      // 演算子は分解どうしの間だけ（分析・課題は式に入らない）
      if (nodeKind(tree.nodes[kids[i]]) !== 'split' || nodeKind(tree.nodes[kids[i + 1]]) !== 'split') continue
      const a = positions[kids[i]]
      const b = positions[kids[i + 1]]
      operators.push({
        parentId: id,
        index: i,
        x: (a.x + cardW + b.x) / 2,
        y: rowY(depth + 1) + cardH / 2,
      })
    }
  }
  place(tree.rootId, pad, 0)

  return {
    width: rootW + pad * 2,
    height: rowY(maxDepth) + cardH + pad,
    positions,
    operators,
  }
}

/* ------------------------------------------------------------------ */
/* 容疑者（赤ピン）                                                    */
/* ------------------------------------------------------------------ */

/** ピンを刺せるノード：ルート以外で名前が入っているもの */
export function canPin(tree: EvidenceTree, id: EvidenceNodeId): boolean {
  const n = tree.nodes[id]
  return !!n && id !== tree.rootId && n.label.trim() !== ''
}

/** 赤ピンの付け外し（最大 MAX_PINS） */
export function togglePin(
  tree: EvidenceTree,
  pins: EvidenceNodeId[],
  id: EvidenceNodeId,
  max = MAX_PINS,
): EvidenceNodeId[] {
  const current = pins.filter((p) => canPin(tree, p))
  if (current.includes(id)) return current.filter((p) => p !== id)
  if (!canPin(tree, id) || current.length >= max) return current
  return [...current, id]
}

/* ------------------------------------------------------------------ */
/* 番号（ルートは番号なし、子 1, 2 / 孫 1-1, 1-2 …）                    */
/* ------------------------------------------------------------------ */

export function numberTree(tree: EvidenceTree): Record<EvidenceNodeId, string> {
  const out: Record<EvidenceNodeId, string> = {}
  const walk = (id: EvidenceNodeId, prefix: string) => {
    const n = tree.nodes[id]
    if (!n) return
    out[id] = prefix
    n.children
      .filter((c) => tree.nodes[c])
      .forEach((c, i) => walk(c, prefix ? `${prefix}-${i + 1}` : `${i + 1}`))
  }
  walk(tree.rootId, '')
  return out
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

/** CAPTAIN 採点用の候補一覧（ピンを刺せるノード） */
export function treeToCandidates(tree: EvidenceTree): Candidate[] {
  return subtreeIds(tree, tree.rootId)
    .filter((id) => canPin(tree, id))
    .map((id) => {
      const n = tree.nodes[id]
      const parent = n.parentId ? tree.nodes[n.parentId] : undefined
      return {
        id,
        title: n.label.trim(),
        summary: `経路：${pathLabels(tree, id).join(' › ')}`,
        category: parent?.split ? LINK_LABEL[parent.split.kind] : '',
      }
    })
}

/* ------------------------------------------------------------------ */
/* 保存データの検証                                                    */
/* ------------------------------------------------------------------ */

/** localStorage から読んだ値が v2 のツリーとして使えるか */
export function isEvidenceTree(v: unknown): v is EvidenceTree {
  if (!v || typeof v !== 'object') return false
  const t = v as Partial<EvidenceTree>
  if (t.version !== 2 || typeof t.rootId !== 'string' || typeof t.seq !== 'number') {
    return false
  }
  if (!t.nodes || typeof t.nodes !== 'object') return false
  const nodes = t.nodes as Record<string, EvidenceNode>
  if (!nodes[t.rootId]) return false
  return Object.values(nodes).every(
    (n) =>
      n &&
      typeof n.label === 'string' &&
      Array.isArray(n.children) &&
      n.children.every((c) => typeof c === 'string' && nodes[c]?.parentId === n.id),
  )
}
