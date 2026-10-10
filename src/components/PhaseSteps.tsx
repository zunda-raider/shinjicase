import { PHASES } from '../data/phases'
import type { Phase } from '../types'

interface Props {
  active: Phase
  onSelect: (phase: Phase) => void
  compact?: boolean
  warrantDone?: boolean
  /** RESULT に点数があるか（ナビヒント用） */
  hasScore?: boolean
}

/** 「‹ 前のフェーズ」「次のフェーズへ ›」 */
export function PhaseSteps({ active, onSelect, compact, hasScore }: Props) {
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
        {hasScore ? (
          <button
            type="button"
            className="btn btn--primary phase-steps__next"
            onClick={() => onSelect('RESULT')}
          >
            採点結果へ{compact ? '' : '（RESULT）'} ›
          </button>
        ) : (
          <span className="phase-steps__end-hint">
            {compact ? '提出は本編で' : '提出ボタンは上の最終報告パネルにあります'}
          </span>
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
