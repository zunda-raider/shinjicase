import { PHASES } from '../data/phases'
import type { Phase } from '../types'

interface Props {
  active: Phase
  onSelect: (phase: Phase) => void
  compact?: boolean
  /** WARRANT 完了時の見た目用（REPORT への進行は next で行う） */
  warrantDone?: boolean
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
        <button
          type="button"
          className="btn btn--ghost phase-steps__prev"
          onClick={() => onSelect(prev.id)}
        >
          ‹ 前のフェーズ{compact ? '' : `（${short(prev.label)}）`}
        </button>
      ) : (
        <span />
      )}
      {next ? (
        <button
          type="button"
          className="btn btn--primary phase-steps__next"
          onClick={() => onSelect(next.id)}
        >
          次のフェーズへ{compact ? '' : `（${short(next.label)}）`} ›
        </button>
      ) : (
        <span className="phase-steps__end-hint">
          {compact ? '提出は本編で' : '提出ボタンは上の最終報告パネルにあります'}
        </span>
      )}
    </div>
  )
}
