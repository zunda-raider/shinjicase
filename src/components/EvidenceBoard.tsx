import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  CARD_H,
  CARD_W,
  LINK_LABEL,
  LINK_SYMBOL,
  MAX_PINS,
  TAG_LABEL,
  V_GAP,
  addSibling,
  canPin,
  cycleSplitTag,
  decompose,
  layoutTree,
  numberTree,
  removeSubtree,
  renameNode,
  toggleSplitKind,
} from '../logic/evidenceTree'
import type { EvidenceNodeId, EvidenceTree, LinkKind } from '../types'
import { TreeThreads } from './TreeThreads'

export type BoardMode = 'decompose' | 'suspect'

interface Props {
  tree: EvidenceTree
  onChange: (tree: EvidenceTree) => void
  mode: BoardMode
  onModeChange: (mode: BoardMode) => void
  /** このシートのノードID → 全体での赤ピン番号（1始まり） */
  pinNumbers: Record<EvidenceNodeId, number>
  /** 全シート合計の赤ピン数 */
  totalPins: number
  onTogglePin: (id: EvidenceNodeId) => void
  /** シートのタブ（ボードの上に出す） */
  tabs?: ReactNode
  onReset: () => void
  onLoadExample: () => void
}

export function EvidenceBoard({
  tree,
  onChange,
  mode,
  onModeChange,
  pinNumbers,
  totalPins,
  onTogglePin,
  onReset,
  onLoadExample,
  tabs,
}: Props) {
  const [selectedId, setSelectedId] = useState<EvidenceNodeId | null>(null)
  const [editingId, setEditingId] = useState<EvidenceNodeId | null>(null)

  const layout = useMemo(() => layoutTree(tree), [tree])
  const numbers = useMemo(() => numberTree(tree), [tree])
  const nodes = Object.values(tree.nodes)
  const isDecompose = mode === 'decompose'
  const activeEditing = isDecompose ? editingId : null

  // Delete キーで選択中カード（と子孫）を削除（分解モードのみ）
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!isDecompose || editingId) return
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (e.key === 'Delete' && selectedId && selectedId !== tree.rootId) {
        e.preventDefault()
        onChange(removeSubtree(tree, selectedId))
        setSelectedId(null)
      }
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDecompose, editingId, selectedId, tree, onChange])

  function startEdit(id: EvidenceNodeId) {
    setSelectedId(id)
    setEditingId(id)
  }

  function handleDecompose(id: EvidenceNodeId, kind: LinkKind) {
    const r = decompose(tree, id, kind)
    if (r.ids.length === 0) return
    onChange(r.tree)
    startEdit(r.ids[0])
  }

  function handleAddSibling(id: EvidenceNodeId) {
    const r = addSibling(tree, id)
    if (!r.id) return
    onChange(r.tree)
    startEdit(r.id)
  }

  /** Tab：右隣の要素へ移る。最後の要素なら右隣に新しい要素を追加。 */
  function handleTab(id: EvidenceNodeId) {
    const parentId = tree.nodes[id]?.parentId
    const siblings = parentId ? tree.nodes[parentId]?.children ?? [] : []
    const next = siblings[siblings.indexOf(id) + 1]
    if (next) startEdit(next)
    else handleAddSibling(id)
  }

  function handleDelete(id: EvidenceNodeId) {
    onChange(removeSubtree(tree, id))
    if (selectedId === id) setSelectedId(null)
    if (editingId === id) setEditingId(null)
  }

  function handleCardClick(id: EvidenceNodeId) {
    if (isDecompose) setSelectedId(id)
    else onTogglePin(id)
  }

  return (
    <main className={`board evidence is-${mode}`} aria-label="捜査ボード">
      <div className="board__header evidence__toolbar">
        <div className="evidence__modes" role="group" aria-label="モード">
          <button
            type="button"
            className={`evidence__mode ${isDecompose ? 'is-active' : ''}`}
            aria-pressed={isDecompose}
            onClick={() => onModeChange('decompose')}
          >
            分解モード
          </button>
          <button
            type="button"
            className={`evidence__mode evidence__mode--suspect ${!isDecompose ? 'is-active' : ''}`}
            aria-pressed={!isDecompose}
            onClick={() => {
              setEditingId(null)
              onModeChange('suspect')
            }}
          >
            📌 容疑者モード（赤ピン {totalPins}/{MAX_PINS}）
          </button>
        </div>
        <div className="evidence__tools">
          <button type="button" className="btn btn--ghost evidence__small" onClick={onLoadExample}>
            例を読み込む
          </button>
          <button
            type="button"
            className="btn btn--ghost evidence__small"
            onClick={() => {
              if (window.confirm('この切り口を初期状態（ルートだけ）に戻しますか？')) {
                setSelectedId(null)
                setEditingId(null)
                onReset()
              }
            }}
          >
            リセット
          </button>
        </div>
      </div>

      <p className="evidence__help">
        {isDecompose ? (
          <>
            上のタブは同じ指標の別の切り口（タブの ✎ かダブルクリックで名前変更）。カードの番号は OPERATION の作戦カードと対応。カードの <b>× 分解</b>（仕組み）／<b>＋ 分解</b>（内訳）で下の段を作り、名前を手で入力（Enter 確定、
            <b>Tab で右隣へ（最後なら要素を追加）</b>）。<b>＋要素</b> で同じ分解に要素を足す。兄弟の間の演算子クリックで × ⇄ ＋、
            × の下の小札で 増減・生産・転換。ダブルクリックで名前変更、✕ か Delete キーで子ごと削除。どこまで分けるかは自由。
          </>
        ) : (
          <>
            ボトルネックだと思うカードをクリックして <b>赤ピン</b>（全切り口の合計で最大 {MAX_PINS}）。右の欄に動機を一行ずつ書いて
            CAPTAIN に提出。もう一度クリックでピンを外す。名前が空のカードとルートには刺せない。
          </>
        )}
      </p>

      {tabs}

      <div className="evidence__scroll">
        <div
          className="evidence__canvas"
          style={{ width: layout.width, height: layout.height }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null)
          }}
        >
          <TreeThreads tree={tree} layout={layout} />

          {nodes.map((n) => {
            const p = layout.positions[n.id]
            if (!p) return null
            const isRoot = n.id === tree.rootId
            const isEditing = activeEditing === n.id
            const pinNo = pinNumbers[n.id]
            const pinned = pinNo !== undefined
            const pinnable = canPin(tree, n.id)
            return (
              <div
                key={n.id}
                className={[
                  'evidence-card',
                  isRoot ? 'is-root' : '',
                  isDecompose && selectedId === n.id ? 'is-selected' : '',
                  !n.label.trim() ? 'is-blank' : '',
                  pinned ? 'is-pinned' : '',
                  !isDecompose && pinnable && !pinned && totalPins < MAX_PINS
                    ? 'is-pinnable'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ left: p.x, top: p.y, width: CARD_W, height: CARD_H }}
                data-testid={`evidence-${n.id}`}
                data-label={n.label}
                onClick={() => handleCardClick(n.id)}
                onDoubleClick={() => {
                  if (isDecompose && !isRoot) startEdit(n.id)
                }}
              >
                {pinned && (
                  <span className="evidence-card__redpin" aria-label={`容疑者 ${pinNo}`}>
                    📌<span className="evidence-card__pin-no">{pinNo}</span>
                  </span>
                )}
                {!isRoot && numbers[n.id] && (
                  <span className="evidence-card__no" title="番号（OPERATION の作戦カードと対応）">
                    {numbers[n.id]}
                  </span>
                )}
                {isRoot && (
                  <span className="evidence-card__tag" title="ⅰ INTAKE の指標（全切り口で共通・ここでは編集不可）">
                    ⅰ の指標
                  </span>
                )}

                {isEditing ? (
                  <input
                    className="evidence-card__input"
                    autoFocus
                    value={n.label}
                    placeholder="名前を入力…"
                    maxLength={40}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => onChange(renameNode(tree, n.id, e.target.value))}
                    onBlur={() => setEditingId((cur) => (cur === n.id ? null : cur))}
                    onKeyDown={(e) => {
                      // 日本語入力の変換確定（IME）の Enter/Tab は無視
                      if (e.nativeEvent.isComposing) return
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        e.preventDefault()
                        setEditingId(null)
                      } else if (e.key === 'Tab' && !e.shiftKey && !isRoot) {
                        e.preventDefault()
                        handleTab(n.id)
                      }
                    }}
                  />
                ) : (
                  <span className="evidence-card__label">
                    {n.label.trim() || '（名前を入力）'}
                  </span>
                )}

                {isDecompose && !isEditing && (
                  <div className="evidence-card__actions" onClick={(e) => e.stopPropagation()}>
                    {n.children.length === 0 && (
                      <>
                        <button
                          type="button"
                          className="evidence-card__act"
                          title="仕組み（掛け算）で分解して下の段を作る"
                          onClick={() => handleDecompose(n.id, 'mul')}
                        >
                          × 分解
                        </button>
                        <button
                          type="button"
                          className="evidence-card__act"
                          title="内訳（足し算）で分解して下の段を作る"
                          onClick={() => handleDecompose(n.id, 'add')}
                        >
                          ＋ 分解
                        </button>
                      </>
                    )}
                    {!isRoot && (
                      <button
                        type="button"
                        className="evidence-card__act evidence-card__act--sib"
                        title="同じ分解に要素を追加（右隣）"
                        onClick={() => handleAddSibling(n.id)}
                      >
                        ＋要素
                      </button>
                    )}
                  </div>
                )}

                {isDecompose && !isEditing && !isRoot && (
                  <button
                    type="button"
                    className="evidence-card__edit"
                    aria-label={`${n.label || '空欄カード'} の名前を編集`}
                    title="名前を編集"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEdit(n.id)
                    }}
                  >
                    ✎
                  </button>
                )}
                {isDecompose && !isRoot && (
                  <button
                    type="button"
                    className="evidence-card__delete"
                    aria-label={`${n.label || '空欄カード'} を削除`}
                    title="子カードごと削除"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(n.id)
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}

          {layout.operators.map((op) => {
            const parent = tree.nodes[op.parentId]
            if (!parent?.split) return null
            const kind = parent.split.kind
            return (
              <button
                key={`${op.parentId}-${op.index}`}
                type="button"
                className={`evidence__op evidence__op--${kind}`}
                style={{ left: op.x, top: op.y }}
                disabled={!isDecompose}
                title={`${parent.label || '親'} の分け方：${LINK_LABEL[kind]}（クリックで × ⇄ ＋）`}
                aria-label={`${parent.label || '親'} の分け方 ${LINK_LABEL[kind]}。クリックで切替`}
                onClick={() => onChange(toggleSplitKind(tree, op.parentId))}
              >
                {LINK_SYMBOL[kind]}
              </button>
            )
          })}

          {nodes.map((n) => {
            const p = layout.positions[n.id]
            if (!p || n.split?.kind !== 'mul' || n.children.length === 0) return null
            if (!isDecompose && !n.split.tag) return null
            return (
              <button
                key={`tag-${n.id}`}
                type="button"
                className={`evidence__mtag ${n.split.tag ? 'is-set' : ''}`}
                style={{ left: p.x + CARD_W / 2, top: p.y + CARD_H + V_GAP / 2 }}
                disabled={!isDecompose}
                title="仕組みの種類：増減・生産・転換（クリックで切替）"
                onClick={() => onChange(cycleSplitTag(tree, n.id))}
              >
                {n.split.tag ? TAG_LABEL[n.split.tag] : 'タグ'}
              </button>
            )
          })}
        </div>
      </div>
    </main>
  )
}
