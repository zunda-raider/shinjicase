import { PHASES } from '../data/phases'
import type { Phase } from '../types'
import { PhaseSteps } from './PhaseSteps'

export type ViewMode = 'NORMAL' | 'GHOST' | 'GOD'

interface Props {
  active: Phase
  onSelect: (phase: Phase) => void
  warrantDone?: boolean
  hasScore?: boolean
  onSubmit?: () => void
  submitDisabled?: boolean
  scoring?: boolean
  archiveAvailable?: boolean
  viewMode?: ViewMode
  onViewMode?: (m: ViewMode) => void
  readOnly?: boolean
}

export function PhaseNav({ active, onSelect, warrantDone, hasScore, onSubmit, submitDisabled, scoring, archiveAvailable, viewMode = 'NORMAL', onViewMode, readOnly }: Props) {
  return (
    <nav className="phase-nav" aria-label="捜査フェーズ">
      <div className="phase-nav__items">
        {PHASES.filter((p) => !readOnly || p.id !== 'RESULT').map((p, i) => (
          <span key={p.id} className="phase-nav__item-wrap">
            {i > 0 && <span className="phase-nav__sep">›</span>}
            <button
              type="button"
              className={[
                'phase-nav__item',
                p.id === active ? 'is-active' : '',
                p.stub ? 'is-stub' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={p.id === active ? 'step' : undefined}
              title={p.stub ? `${p.jp}（モック未実装）` : p.jp}
              onClick={() => onSelect(p.id)}
            >
              {p.label}
            </button>
          </span>
        ))}
      </div>
      <PhaseSteps active={active} onSelect={onSelect} compact warrantDone={warrantDone} hasScore={hasScore} onSubmit={onSubmit} submitDisabled={submitDisabled} scoring={scoring} readOnly={readOnly} />
      {onViewMode && (
        <span className="mode-toggle" role="group" aria-label="表示モード">
          {(['NORMAL', 'GHOST', 'GOD'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`mode-toggle__seg mode-toggle__seg--${m.toLowerCase()} ${viewMode === m ? 'is-active' : ''}`}
              aria-pressed={viewMode === m}
              disabled={m !== 'NORMAL' && !archiveAvailable}
              onClick={() => viewMode !== m && onViewMode(m)}
            >
              {m === 'NORMAL' ? '通常' : m}
            </button>
          ))}
        </span>
      )}
    </nav>
  )
}
