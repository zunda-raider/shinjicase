import { PHASES } from '../data/phases'
import type { Phase } from '../types'

interface Props {
  active: Phase
  onSelect: (phase: Phase) => void
  compact?: boolean
  warrantDone?: boolean
  /** 提出済みか */
  submitted?: boolean
  /** REPORT の提出 */
  onSubmit?: () => void
  submitDisabled?: boolean
  scoring?: boolean
  /** 閲覧モード：提出なし */
  readOnly?: boolean
}

/** 「‹ 前のフェーズ」「次のフェーズへ ›」 */
export function PhaseSteps({
  active,
  onSelect,
  compact,
  submitted,
  onSubmit,
  submitDisabled,
  scoring,
  readOnly,
}: Props) {
  const i = PHASES.findIndex((p) => p.id === active)
  const prev = PHASES[i - 1]
  const next = PHASES[i + 1]
  const short = (label: string) => label.split('（')[0]

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
        {readOnly ? (
          <span className="phase-steps__end-hint">閲覧のみ</span>
        ) : (
          <button
            type="button"
            className="btn btn--primary phase-steps__next phase-steps__submit"
            disabled={submitDisabled || scoring || submitted}
            onClick={() => onSubmit?.()}
          >
            {scoring ? '処理中…' : submitted ? '提出済み' : '提出'}
          </button>
        )}
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
