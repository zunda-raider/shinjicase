import { PHASES } from '../data/phases'
import type { Phase } from '../types'

interface Props {
  active: Phase
  onSelect: (phase: Phase) => void
  compact?: boolean
  /** WARRANT まで到達して令状が承認できるとき true → 「完了」表示 */
  warrantDone?: boolean
}

/** 「‹ 前のフェーズ」「次のフェーズへ ›」（最後は「完了」） */
export function PhaseSteps({ active, onSelect, compact, warrantDone }: Props) {
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
        <button
          type="button"
          className={`btn phase-steps__done ${warrantDone ? 'btn--primary' : 'btn--ghost'}`}
          disabled
          title={warrantDone ? 'CAPTAIN が令状を承認できる状態です' : '評価を終えると完了になります'}
        >
          {warrantDone ? '完了 — 令状承認可' : '完了'}
        </button>
      )}
    </div>
  )
}
