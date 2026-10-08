interface Props {
  title: string
  lines: string[]
}

/** 未実装フェーズのプレースホルダ */
export function StubPhase({ title, lines }: Props) {
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
    </main>
  )
}
