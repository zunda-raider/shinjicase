import type { Phase } from '../types'

const PHASES: { id: Phase; label: string; stub?: boolean }[] = [
  { id: 'BRIEFING', label: 'BRIEFING', stub: true },
  { id: 'EVIDENCE', label: 'EVIDENCE', stub: true },
  { id: 'PRIME_SUSPECT', label: 'PRIME SUSPECT' },
  { id: 'OPERATION', label: 'OPERATION', stub: true },
  { id: 'WARRANT', label: 'WARRANT', stub: true },
]

interface Props {
  active: Phase
}

export function PhaseNav({ active }: Props) {
  return (
    <nav className="phase-nav" aria-label="捜査フェーズ">
      {PHASES.map((p, i) => (
        <span key={p.id} className="phase-nav__item-wrap">
          {i > 0 && <span className="phase-nav__sep">›</span>}
          <span
            className={[
              'phase-nav__item',
              p.id === active ? 'is-active' : '',
              p.stub ? 'is-stub' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={p.stub ? '（モック未実装）' : undefined}
          >
            {p.label}
          </span>
        </span>
      ))}
    </nav>
  )
}
