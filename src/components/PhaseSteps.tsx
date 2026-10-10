import { PHASES } from '../data/phases'
import type { Phase } from '../types'

interface Props {
  active: Phase
  onSelect: (phase: Phase) => void
  compact?: boolean
  warrantDone?: boolean
  /** RESULT に点数があるか（ナビヒント用） */
  hasScore?: boolean
  /** REPORT の提出（次へボタンの位置に出す） */
  onSubmit?: () => void
  submitDisabled?: boolean
  scoring?: boolean
}

/** 「‹ 前のフェーズ」「次のフェーズへ ›」 */
export function PhaseSteps({ active, onSelect, compact, hasScore, onSubmit, submitDisabled, scoring }: Props) {
  const i = PHASES.findIndex((p) => p.id === active)
  const prev = PHASES[i - 1]
  const next = PHASES[i + 1]
  const short = (label: string) => label.split('（')[0]

  if (active === 'RESULT') {
    return (
      <div className={`phase-steps ${compact ? 'is-compact' : ''}`}>
        <button
          type="button"
          className="btn btn--ghost phase-steps__prev"
          onClick={() => onSelect('REPORT')}
        >
          ‹ {compact ? '台本へ' : '戻って台本を直す（REPORT）'}
        </button>
        <span className="phase-steps__end-hint">
          {compact ? '再提出は掲示内' : '再提出は上の掲示パネルから'}
        </span>
      </div>
    )
  }

  if (active === 'REPORT') {
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
        <button
          type="button"
          className="btn btn--primary phase-steps__next phase-steps__submit"
          disabled={submitDisabled || scoring}
          onClick={() => onSubmit?.()}
        >
          {scoring ? '採点中…' : hasScore ? '再提出して採点 ›' : '提出して採点 ›'}
        </button>
      </div>
    )
  }

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
        <span className="phase-steps__end-hint">完了</span>
      )}
    </div>
  )
}
