import type { CaptainState } from '../types'

interface Props {
  state: CaptainState
  lines: string[]
  reviseBonusAwarded: boolean
  onAcknowledge: () => void
}

export function CaptainPanel({
  state,
  lines,
  reviseBonusAwarded,
  onAcknowledge,
}: Props) {
  return (
    <aside className="captain-panel" aria-label="CAPTAIN">
      <header className="captain-panel__header">
        <div className="captain-panel__avatar" aria-hidden="true">
          ★
        </div>
        <div>
          <div className="captain-panel__rank">CAPTAIN</div>
          <div className="captain-panel__sub">捜査官へのチャレンジ</div>
        </div>
      </header>

      <div className="captain-panel__body">
        {(state === 'challenging' || state === 'acknowledged') && (
          <ul className="captain-panel__lines">
            {lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}

        {state === 'challenging' && (
          <button type="button" className="btn btn--ghost" onClick={onAcknowledge}>
            了解 — 見直す
          </button>
        )}

        {state === 'acknowledged' && (
          <p className="captain-panel__hint">
            {reviseBonusAwarded ? 'REVISE BONUS 反映済み' : 'REVISE BONUS 未獲得'}
          </p>
        )}
      </div>
    </aside>
  )
}
