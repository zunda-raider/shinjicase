import { PHASES } from '../data/phases'
import type { Phase } from '../types'
import { PhaseSteps } from './PhaseSteps'

interface Props {
  active: Phase
  onSelect: (phase: Phase) => void
  warrantDone?: boolean
  hasScore?: boolean
}

export function PhaseNav({ active, onSelect, warrantDone, hasScore }: Props) {
  return (
    <nav className="phase-nav" aria-label="捜査フェーズ">
      <div className="phase-nav__items">
        {PHASES.map((p, i) => (
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
      <PhaseSteps active={active} onSelect={onSelect} compact warrantDone={warrantDone} hasScore={hasScore} />
    </nav>
  )
}
