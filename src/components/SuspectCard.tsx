import type { Candidate } from '../types'

interface Props {
  candidate: Candidate
  pinned: boolean
  motive: string
  disabledPin: boolean
  onTogglePin: () => void
  onMotiveChange: (value: string) => void
}

export function SuspectCard({
  candidate,
  pinned,
  motive,
  disabledPin,
  onTogglePin,
  onMotiveChange,
}: Props) {
  return (
    <article
      className={['suspect-card', pinned ? 'is-pinned' : ''].filter(Boolean).join(' ')}
      data-testid={`suspect-${candidate.id}`}
    >
      <button
        type="button"
        className="suspect-card__pin-btn"
        onClick={onTogglePin}
        disabled={!pinned && disabledPin}
        aria-pressed={pinned}
        aria-label={
          pinned
            ? `${candidate.title} のピンを外す`
            : `${candidate.title} をプライム容疑者にピン留め`
        }
      >
        <span className="suspect-card__pin" aria-hidden="true">
          📌
        </span>
      </button>

      <div className="suspect-card__body">
        <span className="suspect-card__cat">{candidate.category}</span>
        <h3 className="suspect-card__title">{candidate.title}</h3>
        <p className="suspect-card__summary">{candidate.summary}</p>

        {pinned && (
          <label className="suspect-card__motive">
            <span className="suspect-card__motive-label">動機 / 仮説（必須）</span>
            <input
              type="text"
              value={motive}
              onChange={(e) => onMotiveChange(e.target.value)}
              placeholder="なぜこのボトルネックが主犯か、一行で…"
              maxLength={120}
            />
          </label>
        )}
      </div>
    </article>
  )
}
