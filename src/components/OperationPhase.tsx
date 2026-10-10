import { useMemo, useRef, useState } from 'react'
import {
  LINK_SYMBOL,
  TREE_SIZE_COMPACT,
  layoutTree,
  numberTree,
  subtreeIds,
} from '../logic/evidenceTree'
import { circled, operationCaptainLines, pinMeasureStatus } from '../logic/operation'
import { filledMeasureCount, parsePinKey } from '../logic/workspace'
import type { EvidenceNodeId, EvidenceSheet, EvidenceWorkspace, SheetId } from '../types'
import { TreeThreads } from './TreeThreads'

interface Props {
  ws: EvidenceWorkspace
  sheet: EvidenceSheet
  onSelectSheet: (id: SheetId) => void
  /** 全シート共通の赤ピン（"シートID/ノードID"） */
  pins: string[]
  /** 施策を追加して新しい施策IDを返す */
  onAddMeasure: (nodeId: EvidenceNodeId, after?: string) => string
  onUpdateMeasure: (nodeId: EvidenceNodeId, measureId: string, text: string) => void
  onRemoveMeasure: (nodeId: EvidenceNodeId, measureId: string) => void
}

/** ⅳ 打ち手立案：左に番号つきツリー（読み取り専用）、右に番号ごとの作戦カード */
export function OperationPhase({
  ws,
  sheet,
  onSelectSheet,
  pins,
  onAddMeasure,
  onUpdateMeasure,
  onRemoveMeasure,
}: Props) {
  const tree = sheet.tree
  const size = TREE_SIZE_COMPACT
  const layout = useMemo(() => layoutTree(tree, TREE_SIZE_COMPACT), [tree])
  const numbers = useMemo(() => numberTree(tree), [tree])
  const order = useMemo(() => subtreeIds(tree, tree.rootId), [tree])

  const [selectedId, setSelectedId] = useState<EvidenceNodeId | null>(null)
  const [hoverId, setHoverId] = useState<EvidenceNodeId | null>(null)
  const [onlySuspects, setOnlySuspects] = useState(false)
  const [focusMeasureId, setFocusMeasureId] = useState<string | null>(null)

  const cardRefs = useRef<Record<string, HTMLElement | null>>({})
  const nodeRefs = useRef<Record<string, HTMLElement | null>>({})

  /** このシートのノード → 全体の容疑者番号 */
  const pinNumbers = useMemo(() => {
    const out: Record<EvidenceNodeId, number> = {}
    pins.forEach((key, i) => {
      const { sheetId, nodeId } = parsePinKey(key)
      if (sheetId === sheet.id) out[nodeId] = i + 1
    })
    return out
  }, [pins, sheet.id])

  const status = useMemo(() => pinMeasureStatus(ws, pins), [ws, pins])
  const missing = status.filter((s) => s.measureCount === 0)
  const captainLines = useMemo(() => operationCaptainLines(ws, pins), [ws, pins])

  const cardIds = useMemo(() => {
    const ids = order.filter((id) => id !== tree.rootId)
    const filtered = onlySuspects ? ids.filter((id) => pinNumbers[id] !== undefined) : ids
    return [...filtered].sort((a, b) => {
      const pa = pinNumbers[a] ?? Infinity
      const pb = pinNumbers[b] ?? Infinity
      if (pa !== pb) return pa - pb
      return order.indexOf(a) - order.indexOf(b)
    })
  }, [order, tree.rootId, onlySuspects, pinNumbers])

  const pinCountBySheet = useMemo(() => {
    const out: Record<string, number> = {}
    pins.forEach((k) => {
      const { sheetId } = parsePinKey(k)
      out[sheetId] = (out[sheetId] ?? 0) + 1
    })
    return out
  }, [pins])

  const highlight = hoverId ?? selectedId

  function selectFromTree(id: EvidenceNodeId) {
    if (id === tree.rootId) return
    setSelectedId(id)
    if (onlySuspects && pinNumbers[id] === undefined) setOnlySuspects(false)
    requestAnimationFrame(() =>
      cardRefs.current[id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
    )
  }

  function selectFromCard(id: EvidenceNodeId) {
    setSelectedId(id)
    nodeRefs.current[id]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }

  function add(nodeId: EvidenceNodeId, after?: string) {
    const id = onAddMeasure(nodeId, after)
    if (id) setFocusMeasureId(id)
  }

  return (
    <div className="operation operation--compact">
      <section className="board operation__tree" aria-label="選んだツリー">
        <div className="board__header operation__tree-header">
          <h2>容疑者ツリー</h2>
          <label className="operation__sheet-select">
            <span>切り口</span>
            <select value={sheet.id} onChange={(e) => onSelectSheet(e.target.value)}>
              {ws.sheets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {pinCountBySheet[s.id] ? `（📌${pinCountBySheet[s.id]}）` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="evidence__help">
          番号つきの箱をクリックすると右の作戦カードへ。赤丸は容疑者（ボトルネック）。ツリーの編集は EVIDENCE で。
        </p>
        <div className="evidence__scroll operation__scroll">
          <div
            className="evidence__canvas"
            style={{ width: layout.width, height: layout.height }}
          >
            <TreeThreads tree={tree} layout={layout} size={size} />
            {Object.values(tree.nodes).map((n) => {
              const p = layout.positions[n.id]
              if (!p) return null
              const isRoot = n.id === tree.rootId
              const pinNo = pinNumbers[n.id]
              const count = filledMeasureCount(sheet, n.id)
              return (
                <div
                  key={n.id}
                  ref={(el) => {
                    nodeRefs.current[n.id] = el
                  }}
                  className={[
                    'evidence-card',
                    'operation-node',
                    isRoot ? 'is-root' : '',
                    !n.label.trim() ? 'is-blank' : '',
                    pinNo !== undefined ? 'is-pinned' : '',
                    highlight === n.id ? 'is-highlight' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ left: p.x, top: p.y, width: size.cardW, height: size.cardH }}
                  data-label={n.label}
                  data-number={numbers[n.id]}
                  onClick={() => selectFromTree(n.id)}
                  onMouseEnter={() => setHoverId(n.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  {pinNo !== undefined && (
                    <span className="evidence-card__redpin" aria-label={`容疑者 ${pinNo}`}>
                      📌<span className="evidence-card__pin-no">{pinNo}</span>
                    </span>
                  )}
                  {isRoot ? (
                    <span className="evidence-card__tag">ⅰ の指標</span>
                  ) : (
                    <span className="evidence-card__no">{numbers[n.id]}</span>
                  )}
                  <span className="evidence-card__label">{n.label.trim() || '（未記入）'}</span>
                  {!isRoot && (
                    <span className={`operation-node__count ${count ? 'has' : ''}`}>
                      作戦 {count}
                    </span>
                  )}
                </div>
              )
            })}
            {layout.operators.map((op) => {
              const kind = tree.nodes[op.parentId]?.split?.kind
              if (!kind) return null
              return (
                <span
                  key={`${op.parentId}-${op.index}`}
                  className={`evidence__op evidence__op--${kind} is-static`}
                  style={{ left: op.x, top: op.y }}
                  aria-hidden="true"
                >
                  {LINK_SYMBOL[kind]}
                </span>
              )
            })}
          </div>
        </div>
      </section>

      <section className="operation__plans" aria-label="作戦カード">
        <div className="operation-captain">
          <div className="operation-captain__head">
            <span className="captain-panel__avatar" aria-hidden="true">★</span>
            <span className="captain-panel__rank">CAPTAIN</span>
          </div>
          <ul className="operation-captain__lines">
            {captainLines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>

        {missing.length > 0 && (
          <ul className="operation__warnings" aria-label="作戦のない容疑者">
            {missing.map((m) => (
              <li key={m.key}>
                ⚠ 容疑者{circled(m.pinNo)}（{m.number} {m.title}
                {m.sheetId !== sheet.id ? ` ／ ${m.sheetName}` : ''}）に作戦がない
              </li>
            ))}
          </ul>
        )}

        <div className="operation__plans-header">
          <h2>作戦カード</h2>
          <label className="operation__filter">
            <input
              type="checkbox"
              checked={onlySuspects}
              onChange={(e) => setOnlySuspects(e.target.checked)}
            />
            容疑者のみ表示
          </label>
        </div>

        <div className="operation__cards">
          {cardIds.length === 0 && (
            <p className="suspect-list__empty">
              {onlySuspects
                ? 'この切り口には赤ピンの容疑者がいない。'
                : 'この切り口はまだ分解されていない。EVIDENCE でツリーを作ろう。'}
            </p>
          )}
          {cardIds.map((id) => {
            const n = tree.nodes[id]
            const pinNo = pinNumbers[id]
            const list = sheet.measures[id] ?? []
            const count = filledMeasureCount(sheet, id)
            return (
              <article
                key={id}
                ref={(el) => {
                  cardRefs.current[id] = el
                }}
                className={[
                  'plan-card',
                  pinNo !== undefined ? 'is-suspect' : '',
                  highlight === id ? 'is-highlight' : '',
                  pinNo !== undefined && count === 0 ? 'is-missing' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-number={numbers[id]}
                onMouseEnter={() => setHoverId(id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <header className="plan-card__head" onClick={() => selectFromCard(id)}>
                  <span className="plan-card__no">{numbers[id]}</span>
                  <span className="plan-card__name">{n.label.trim() || '（未記入）'}</span>
                  {pinNo !== undefined && (
                    <span className="plan-card__pin" title="容疑者">
                      📌{circled(pinNo)}
                    </span>
                  )}
                  <span className="plan-card__count">{count} 件</span>
                </header>
                {list.length > 0 && (
                  <ul className="plan-card__measures">
                    {list.map((m, i) => (
                      <li key={m.id}>
                        <span className="plan-card__bullet">{i + 1}.</span>
                        <input
                          type="text"
                          value={m.text}
                          autoFocus={focusMeasureId === m.id}
                          placeholder="施策を入力（Enter で次の行）"
                          aria-label={`${numbers[id]} ${n.label} の施策 ${i + 1}`}
                          maxLength={120}
                          onFocus={() => setSelectedId(id)}
                          onChange={(e) => onUpdateMeasure(id, m.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                              e.preventDefault()
                              add(id, m.id)
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="plan-card__del"
                          aria-label="この施策を削除"
                          onClick={() => onRemoveMeasure(id, m.id)}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" className="plan-card__add" onClick={() => add(id)}>
                  ＋施策を追加
                </button>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
