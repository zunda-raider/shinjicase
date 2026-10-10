import { useRef, useState } from 'react'
import type { EvidenceSheet, SheetId } from '../types'

interface Props {
  sheets: EvidenceSheet[]
  activeId: SheetId
  pinCounts: Record<SheetId, number>
  onSelect: (id: SheetId) => void
  onRename: (id: SheetId, name: string) => void
  onAdd: () => void
  onRemove: (id: SheetId) => void
  readOnly?: boolean
  badges?: Record<SheetId, string>
}

/** 切り口（同じ指標に対する別の分解）のタブ */
export function SheetTabs({
  sheets,
  activeId,
  pinCounts,
  onSelect,
  onRename,
  onAdd,
  onRemove,
  readOnly,
  badges,
}: Props) {
  const [editing, setEditing] = useState<SheetId | null>(null)
  const [draft, setDraft] = useState('')
  /** Enter/Esc の後に blur が来ても二重に処理しない */
  const doneRef = useRef(false)

  function startEdit(s: EvidenceSheet) {
    doneRef.current = false
    setDraft(s.name)
    setEditing(s.id)
  }

  /** 確定（空の名前は無視して元の名前のまま） */
  function commit() {
    if (doneRef.current) return
    doneRef.current = true
    if (editing && draft.trim()) onRename(editing, draft)
    setEditing(null)
  }

  function cancel() {
    doneRef.current = true
    setEditing(null)
  }

  return (
    <div className="sheet-tabs" role="tablist" aria-label="切り口（シート）">
      {sheets.map((s) => {
        const active = s.id === activeId
        const pins = pinCounts[s.id] ?? 0
        return (
          <div
            key={s.id}
            className={`sheet-tab ${active ? 'is-active' : ''}`}
            role="tab"
            aria-selected={active}
            data-sheet={s.name}
            title="クリックで切替・ダブルクリックか ✎ で名前変更"
            onClick={() => onSelect(s.id)}
            onDoubleClick={() => !readOnly && startEdit(s)}
          >
            {editing === s.id ? (
              <input
                className="sheet-tab__input"
                autoFocus
                value={draft}
                maxLength={30}
                aria-label="切り口の名前"
                onFocus={(e) => e.currentTarget.select()}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return
                  if (e.key === 'Enter') commit()
                  if (e.key === 'Escape') cancel()
                }}
              />
            ) : (
              <span className="sheet-tab__name">{s.name}</span>
            )}
            {badges?.[s.id] && <span className="qa-chip">{badges[s.id]}</span>}
            {!readOnly && editing !== s.id && (
              <button
                type="button"
                className="sheet-tab__edit"
                aria-label={`${s.name} の名前を変更`}
                title="名前を変更"
                onClick={(e) => {
                  e.stopPropagation()
                  startEdit(s)
                }}
              >
                ✎
              </button>
            )}
            {pins > 0 && (
              <span className="sheet-tab__pins" title={`赤ピン ${pins}`}>
                📌{pins}
              </span>
            )}
            {!readOnly && sheets.length > 1 && editing !== s.id && (
              <button
                type="button"
                className="sheet-tab__close"
                aria-label={`${s.name} を削除`}
                title="この切り口を削除"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(s.id)
                }}
              >
                ✕
              </button>
            )}
          </div>
        )
      })}
      {!readOnly && <button type="button" className="sheet-tabs__add" onClick={onAdd} title="同じ指標で別の分解を考える">
        ＋ 切り口を追加
      </button>}
    </div>
  )
}
