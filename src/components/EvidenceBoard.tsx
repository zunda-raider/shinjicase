import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  BOARD_H,
  BOARD_W,
  CARD_H,
  CARD_W,
  LINK_LABEL,
  LINK_SYMBOL,
  TAG_LABEL,
  addChild,
  cycleLinkTag,
  moveNode,
  removeSubtree,
  renameNode,
  suggestChildPos,
  toggleLinkKind,
} from '../logic/evidenceTree'
import type { EvidenceNode, EvidenceNodeId, EvidenceTree, LinkKind } from '../types'

interface Props {
  tree: EvidenceTree
  onChange: (tree: EvidenceTree) => void
  onReset: () => void
}

type Drag =
  | { type: 'card'; id: EvidenceNodeId; offX: number; offY: number }
  | {
      type: 'thread'
      fromId: EvidenceNodeId
      startX: number
      startY: number
      x: number
      y: number
    }

/** 糸を引き出したと見なす最小距離（これ未満はクリック扱いで自動配置） */
const DRAG_THRESHOLD = 12

function toCanvas(el: HTMLElement | null, clientX: number, clientY: number) {
  const rect = el?.getBoundingClientRect()
  if (!rect) return { x: clientX, y: clientY }
  return { x: clientX - rect.left, y: clientY - rect.top }
}

function center(n: EvidenceNode) {
  return { x: n.x + CARD_W / 2, y: n.y + CARD_H / 2 }
}

export function EvidenceBoard({ tree, onChange, onReset }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [selectedId, setSelectedId] = useState<EvidenceNodeId | null>(null)
  const [editingId, setEditingId] = useState<EvidenceNodeId | null>(null)
  const [newKind, setNewKind] = useState<LinkKind>('mul')

  // ドラッグ中の最新値をハンドラから参照する
  const treeRef = useRef(tree)
  const dragRef = useRef(drag)
  const onChangeRef = useRef(onChange)
  const newKindRef = useRef(newKind)
  useEffect(() => {
    treeRef.current = tree
    dragRef.current = drag
    onChangeRef.current = onChange
    newKindRef.current = newKind
  })

  const nodes = Object.values(tree.nodes)
  const childCount = nodes.length - 1

  const dragKey = drag
    ? drag.type === 'card'
      ? `card:${drag.id}`
      : `thread:${drag.fromId}`
    : null

  // ドラッグ（カード移動・糸の引き出し）を window で追跡
  useEffect(() => {
    if (!dragKey) return

    function onMove(e: PointerEvent) {
      const d = dragRef.current
      if (!d) return
      const p = toCanvas(canvasRef.current, e.clientX, e.clientY)
      if (d.type === 'card') {
        onChangeRef.current(moveNode(treeRef.current, d.id, { x: p.x - d.offX, y: p.y - d.offY }))
      } else {
        setDrag({ ...d, x: p.x, y: p.y })
      }
    }

    function onUp(e: PointerEvent) {
      const d = dragRef.current
      setDrag(null)
      if (!d || d.type !== 'thread') return
      const p = toCanvas(canvasRef.current, e.clientX, e.clientY)
      const dist = Math.hypot(p.x - d.startX, p.y - d.startY)
      const t = treeRef.current
      const pos =
        dist < DRAG_THRESHOLD
          ? suggestChildPos(t, d.fromId)
          : { x: p.x - CARD_W / 2, y: p.y - CARD_H / 2 }
      const { tree: next, id } = addChild(t, d.fromId, pos, newKindRef.current)
      if (!id) return
      onChangeRef.current(next)
      setSelectedId(id)
      setEditingId(id)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    // ドラッグの開始/終了でだけ張り替える（最新値は ref 経由）
  }, [dragKey])

  // Delete キーで選択中カード（と子孫）を削除
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editingId) return
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (e.key === 'Delete' && selectedId) {
        if (selectedId === tree.rootId) return
        e.preventDefault()
        onChange(removeSubtree(tree, selectedId))
        setSelectedId(null)
      }
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingId, selectedId, tree, onChange])

  function startCardDrag(e: ReactPointerEvent, n: EvidenceNode) {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('input, button, .evidence-card__port')) return
    e.preventDefault()
    const p = toCanvas(canvasRef.current, e.clientX, e.clientY)
    setSelectedId(n.id)
    setDrag({ type: 'card', id: n.id, offX: p.x - n.x, offY: p.y - n.y })
  }

  function startThread(e: ReactPointerEvent, n: EvidenceNode) {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const p = toCanvas(canvasRef.current, e.clientX, e.clientY)
    setSelectedId(n.id)
    setEditingId(null)
    setDrag({ type: 'thread', fromId: n.id, startX: p.x, startY: p.y, x: p.x, y: p.y })
  }

  function deleteNode(id: EvidenceNodeId) {
    onChange(removeSubtree(tree, id))
    if (selectedId === id) setSelectedId(null)
    if (editingId === id) setEditingId(null)
  }

  const threadFrom =
    drag?.type === 'thread' ? tree.nodes[drag.fromId] : undefined

  return (
    <main className="board evidence" aria-label="捜査ボード">
      <div className="board__header evidence__toolbar">
        <h2>捜査ボード — 証拠カードを糸でつなぐ</h2>
        <div className="evidence__tools">
          <span className="evidence__tools-label">新しい糸</span>
          {(['mul', 'add'] as LinkKind[]).map((k) => (
            <button
              key={k}
              type="button"
              className={`evidence__kind ${newKind === k ? 'is-active' : ''}`}
              aria-pressed={newKind === k}
              onClick={() => setNewKind(k)}
            >
              {LINK_SYMBOL[k]} {LINK_LABEL[k]}
            </button>
          ))}
          <span className="evidence__count">カード {childCount} 枚</span>
          <button
            type="button"
            className="btn btn--ghost evidence__reset"
            onClick={() => {
              if (window.confirm('捜査ボードを初期状態に戻しますか？')) {
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
        カード右の <b className="evidence__help-port">●</b> から糸を引き出して離すと空欄カードができる（クリックだけなら自動配置）。
        ダブルクリックで名前を編集、ドラッグで移動、バッジクリックで ×／＋ 切替、
        <b>×</b> の下の小札で 増減・生産・転換 タグ。選択して Delete キー or 右上 ✕ で子ごと削除。
      </p>

      <div className="evidence__scroll">
        <div
          ref={canvasRef}
          className={`evidence__canvas ${drag ? 'is-dragging' : ''}`}
          style={{ width: BOARD_W, height: BOARD_H }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedId(null)
              setEditingId(null)
            }
          }}
        >
          <svg
            className="evidence__threads"
            width={BOARD_W}
            height={BOARD_H}
            aria-hidden="true"
          >
            {nodes.map((n) => {
              if (!n.parentId) return null
              const parent = tree.nodes[n.parentId]
              if (!parent) return null
              const a = center(parent)
              const b = center(n)
              return (
                <line
                  key={n.id}
                  className={`evidence__thread evidence__thread--${n.link?.kind ?? 'mul'}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                />
              )
            })}
            {threadFrom && drag?.type === 'thread' && (
              <line
                className="evidence__thread evidence__thread--pulling"
                x1={threadFrom.x + CARD_W}
                y1={threadFrom.y + CARD_H / 2}
                x2={drag.x}
                y2={drag.y}
              />
            )}
          </svg>

          {nodes.map((n) => {
            const isRoot = n.id === tree.rootId
            const isEditing = editingId === n.id
            return (
              <div
                key={n.id}
                className={[
                  'evidence-card',
                  isRoot ? 'is-root' : '',
                  selectedId === n.id ? 'is-selected' : '',
                  !n.label.trim() ? 'is-blank' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ left: n.x, top: n.y, width: CARD_W, height: CARD_H }}
                data-testid={`evidence-${n.id}`}
                onPointerDown={(e) => startCardDrag(e, n)}
                onDoubleClick={() => {
                  if (!isRoot) setEditingId(n.id)
                }}
              >
                <span className="evidence-card__pin" aria-hidden="true" />
                {isRoot && <span className="evidence-card__tag">ⅰ の指標</span>}
                {isEditing ? (
                  <input
                    className="evidence-card__input"
                    autoFocus
                    value={n.label}
                    placeholder="カード名…"
                    maxLength={40}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => onChange(renameNode(tree, n.id, e.target.value))}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        e.currentTarget.blur()
                      }
                    }}
                  />
                ) : (
                  <span className="evidence-card__label" title={isRoot ? undefined : 'ダブルクリックで編集'}>
                    {n.label.trim() || '（ダブルクリックで名前）'}
                  </span>
                )}

                {!isRoot && (
                  <button
                    type="button"
                    className="evidence-card__delete"
                    aria-label={`${n.label || '空欄カード'} を削除`}
                    title="子カードごと削除"
                    onClick={() => deleteNode(n.id)}
                  >
                    ✕
                  </button>
                )}
                {!isRoot && !isEditing && (
                  <button
                    type="button"
                    className="evidence-card__edit"
                    aria-label={`${n.label || '空欄カード'} の名前を編集`}
                    title="名前を編集"
                    onClick={() => {
                      setSelectedId(n.id)
                      setEditingId(n.id)
                    }}
                  >
                    ✎
                  </button>
                )}
                <span
                  className="evidence-card__port"
                  role="button"
                  aria-label={`${n.label || 'カード'} から糸を引き出す`}
                  title="ドラッグで糸を引き出す"
                  onPointerDown={(e) => startThread(e, n)}
                />
              </div>
            )
          })}

          {nodes.map((n) => {
            if (!n.parentId || !n.link) return null
            const parent = tree.nodes[n.parentId]
            if (!parent) return null
            const a = center(parent)
            const b = center(n)
            const mx = (a.x + b.x) / 2
            const my = (a.y + b.y) / 2
            const link = n.link
            return (
              <div
                key={`badge-${n.id}`}
                className="evidence__badge-wrap"
                style={{ left: mx, top: my }}
              >
                <button
                  type="button"
                  className={`evidence__badge evidence__badge--${link.kind}`}
                  title={`${LINK_LABEL[link.kind]}（クリックで ×／＋ 切替）`}
                  aria-label={`${n.label || 'カード'} への糸：${LINK_LABEL[link.kind]}。クリックで切替`}
                  onClick={() => onChange(toggleLinkKind(tree, n.id))}
                >
                  {LINK_SYMBOL[link.kind]}
                </button>
                {link.kind === 'mul' && (
                  <button
                    type="button"
                    className={`evidence__mtag ${link.tag ? 'is-set' : ''}`}
                    title="増減・生産・転換（クリックで切替）"
                    onClick={() => onChange(cycleLinkTag(tree, n.id))}
                  >
                    {link.tag ? TAG_LABEL[link.tag] : 'タグ'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
