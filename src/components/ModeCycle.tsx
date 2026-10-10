import type { ViewMode } from './PhaseNav'

const NEXT: Record<ViewMode, ViewMode> = { NORMAL: 'GHOST', GHOST: 'GOD', GOD: 'NORMAL' }

/** NORMAL → GHOST → GOD → NORMAL（模範データがなければ NORMAL のまま） */
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
    <button
      type="button"
      className={`mode-cycle mode-cycle--${mode.toLowerCase()}`}
      disabled={!available && mode === 'NORMAL'}
      onClick={() => onChange(available ? NEXT[mode] : 'NORMAL')}
    >
      {mode}
    </button>
  )
}
