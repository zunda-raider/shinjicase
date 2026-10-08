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
        {state === 'idle' && (
          <p className="captain-panel__idle">
            ツリーを分解したら「容疑者モード」でボトルネックに赤ピンを最大3本。動機を書いて提出せよ。こちらから質問する。
          </p>
        )}

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
            ツリー・ピン・動機を直して再提出できる。
            {reviseBonusAwarded
              ? ' REVISE BONUS 反映済み。'
              : ' 再提出で REVISE BONUS を獲得。'}
          </p>
        )}
      </div>
    </aside>
  )
}
