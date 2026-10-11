import { useMemo } from 'react'
import { ROLE_LABEL, collectMeasures } from '../logic/warrant'
import type { EvidenceWorkspace, MeasureKey, WarrantRole, WarrantState } from '../types'
import { QaText } from './QaText'

export interface WarrantRow {
  key: string
  number: string
  name: string
  role: WarrantRole
  reason: string
  /** 最初の5分の施策（GOD で番号を赤に） */
  initial?: boolean
}

interface ListProps {
  rows: WarrantRow[]
  readOnly?: boolean
  onRole?: (key: MeasureKey, role: WarrantRole) => void
  onReason?: (key: MeasureKey, text: string) => void
}

const ROLES: WarrantRole[] = ['main', 'sub', '']

/** 施策ごとに 番号・名前・メイン/サブ/—・理由 の1行 */
export function WarrantList({ rows, readOnly, onRole, onReason }: ListProps) {
  if (!rows.length) return <p className="suspect-list__empty">施策なし</p>
  return (
    <ul className="why-list">
      {rows.map((r) => (
        <li key={r.key} className={`why-row${r.role === 'main' ? ' is-main' : ''}`}>
          <span className={`why-row__no${r.initial ? ' is-initial' : ''}`}>{r.number}</span>
          <span className="why-row__name" title={r.name}>
            <QaText text={r.name} />
          </span>
          {readOnly ? (
            <span className={`why-row__role why-row__role--${r.role || 'none'}`}>{r.role ? ROLE_LABEL[r.role] : '？'}</span>
          ) : (
            <select
              className="why-row__role"
              aria-label={`${r.name} の位置づけ`}
              value={r.role}
              onChange={(e) => onRole?.(r.key, e.target.value as WarrantRole)}
            >
              {ROLES.map((x) => (
                <option key={x} value={x}>
                  {ROLE_LABEL[x]}
                </option>
              ))}
            </select>
          )}
          {readOnly ? (
            <span className="why-row__reason">{r.reason ? <QaText text={r.reason} /> : <span className="model-empty">—</span>}</span>
          ) : (
            <textarea
              className="why-row__reason"
              rows={1}
              maxLength={300}
              aria-label={`${r.name} を選んだ理由`}
              placeholder="理由"
              value={r.reason}
              onChange={(e) => onReason?.(r.key, e.target.value)}
            />
          )}
        </li>
      ))}
    </ul>
  )
}

interface Props {
  ws: EvidenceWorkspace
  pins: string[]
  warrant: WarrantState
  onRole: (key: MeasureKey, role: WarrantRole) => void
  onReason: (key: MeasureKey, text: string) => void
}

/** ⅴ なぜその施策を選んだか */
export function WarrantPhase({ ws, pins, warrant, onRole, onReason }: Props) {
  const rows = useMemo(
    () =>
      collectMeasures(ws, pins).map((m) => ({
        key: m.key,
        number: m.number,
        name: m.text,
        role: warrant.roles[m.key] ?? '',
        reason: warrant.reasons[m.key] ?? '',
      })),
    [ws, pins, warrant],
  )
  return (
    <section className="board warrant-why" aria-label="なぜその施策か">
      <WarrantList rows={rows} onRole={onRole} onReason={onReason} />
    </section>
  )
}
