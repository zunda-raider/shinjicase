import { useState } from 'react'
import type { EvidenceSheet, SheetId } from '../types'

interface Props {
  sheets: EvidenceSheet[]
  activeId: SheetId
  pinCounts: Record<SheetId, number>
  onSelect: (id: SheetId) => void
  onRename: (id: SheetId, name: string) => void
  onAdd: () => void
  onRemove: (id: SheetId) => void
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
}: Props) {
  const [editing, setEditing] = useState<SheetId | null>(null)
  const [draft, setDraft] = useState('')

  function commit() {
    if (editing) onRename(editing, draft)
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
            title="クリックで切替・ダブルクリックで名前変更"
            onClick={() => onSelect(s.id)}
            onDoubleClick={() => {
              setDraft(s.name)
              setEditing(s.id)
            }}
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
                  if (e.key === 'Enter') commit()
                  if (e.key === 'Escape') setEditing(null)
                }}
              />
            ) : (
              <span className="sheet-tab__name">{s.name}</span>
            )}
            {pins > 0 && (
              <span className="sheet-tab__pins" title={`赤ピン ${pins}`}>
                📌{pins}
              </span>
            )}
            {sheets.length > 1 && editing !== s.id && (
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
      <button type="button" className="sheet-tabs__add" onClick={onAdd} title="同じ指標で別の分解を考える">
        ＋ 切り口を追加
      </button>
    </div>
  )
}
