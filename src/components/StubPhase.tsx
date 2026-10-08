interface Props {
  title: string
  lines: string[]
  nextLabel?: string
  onNext?: () => void
}

/** 未実装フェーズのプレースホルダ */
export function StubPhase({ title, lines, nextLabel, onNext }: Props) {
  return (
    <main className="board stub-phase" aria-label={title}>
      <div className="board__header">
        <h2>{title}</h2>
        <span className="board__hint">モック未実装</span>
      </div>
      <ul className="stub-phase__list">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      {onNext && nextLabel && (
        <div className="board__actions">
          <button type="button" className="btn btn--primary" onClick={onNext}>
            {nextLabel}
          </button>
        </div>
      )}
    </main>
  )
}
