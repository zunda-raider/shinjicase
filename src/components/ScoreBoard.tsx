interface Props {
  score: number
  reviseBonus: number
  pinnedCount: number
  maxPins: number
}

export function ScoreBoard({ score, reviseBonus, pinnedCount, maxPins }: Props) {
  return (
    <div className="score-board" aria-live="polite">
      <div className="score-board__item">
        <span className="score-board__label">SCORE</span>
        <span className="score-board__value">{score}</span>
      </div>
      <div className="score-board__item">
        <span className="score-board__label">REVISE BONUS</span>
        <span className={`score-board__value ${reviseBonus > 0 ? 'is-bonus' : ''}`}>
          {reviseBonus > 0 ? `+${reviseBonus}` : '—'}
        </span>
      </div>
      <div className="score-board__item">
        <span className="score-board__label">PRIMES</span>
        <span className="score-board__value">
          {pinnedCount}/{maxPins}
        </span>
      </div>
    </div>
  )
}
