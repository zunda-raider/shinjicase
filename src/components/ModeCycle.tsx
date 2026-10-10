import type { ViewMode } from './PhaseNav'

/** NORMAL / GHOST / GOD を直接切り替える */
export function ModeCycle({
  mode,
  available,
  onChange,
}: {
  mode: ViewMode
  available: boolean
  onChange: (m: ViewMode) => void
}) {
  return (
    <span className="mode-switch" role="group" aria-label="表示モード">
      {(['NORMAL', 'GHOST', 'GOD'] as const).map((m) => (
        <button
          key={m}
          type="button"
          className={`mode-switch__seg mode-switch__seg--${m.toLowerCase()} ${m === mode ? 'is-active' : ''}`}
          aria-pressed={m === mode}
          disabled={m !== 'NORMAL' && !available}
          onClick={() => m !== mode && onChange(m)}
        >
          {m}
        </button>
      ))}
    </span>
  )
}
