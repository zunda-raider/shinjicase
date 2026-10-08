import { PHASES } from '../data/phases'
import type { Phase } from '../types'

interface Props {
  active: Phase
  onSelect: (phase: Phase) => void
  compact?: boolean
}

/** 「‹ 前のフェーズ」「次のフェーズへ ›」 */
export function PhaseSteps({ active, onSelect, compact }: Props) {
  const i = PHASES.findIndex((p) => p.id === active)
  const prev = PHASES[i - 1]
  const next = PHASES[i + 1]
  const short = (label: string) => label.split('（')[0]
  return (
    <div className={`phase-steps ${compact ? 'is-compact' : ''}`}>
      {prev ? (
        <button type="button" className="btn btn--ghost phase-steps__prev" onClick={() => onSelect(prev.id)}>
          ‹ 前のフェーズ{compact ? '' : `（${short(prev.label)}）`}
        </button>
      ) : (
        <span />
      )}
      {next && (
        <button type="button" className="btn btn--primary phase-steps__next" onClick={() => onSelect(next.id)}>
          次のフェーズへ{compact ? '' : `（${short(next.label)}）`} ›
        </button>
      )}
    </div>
  )
}
