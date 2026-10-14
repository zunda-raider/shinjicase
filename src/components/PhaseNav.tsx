import { PHASES } from '../data/phases'
import type { Phase } from '../types'
import { PhaseSteps } from './PhaseSteps'

export type ViewMode = 'NORMAL' | 'GHOST' | 'GOD'

interface Props {
  active: Phase
  onSelect: (phase: Phase) => void
  /** TITLE へ戻る（進捗は localStorage に残す） */
  onTitle: () => void
  warrantDone?: boolean
  hasScore?: boolean
  onSubmit?: () => void
  submitDisabled?: boolean
  scoring?: boolean
  readOnly?: boolean
}

export function PhaseNav({
  active,
  onSelect,
  onTitle,
  warrantDone,
  hasScore,
  onSubmit,
  submitDisabled,
  scoring,
  readOnly,
}: Props) {
  return (
    <nav className="phase-nav" aria-label="捜査フェーズ">
      <div className="phase-nav__items">
        <button type="button" className="phase-nav__title" onClick={onTitle} title="事件ファイル一覧へ">
          タイトル
        </button>
        <span className="phase-nav__sep">›</span>
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
      <PhaseSteps
        active={active}
        onSelect={onSelect}
        compact
        warrantDone={warrantDone}
        hasScore={hasScore}
        onSubmit={onSubmit}
        submitDisabled={submitDisabled}
        scoring={scoring}
        readOnly={readOnly}
      />
    </nav>
  )
}
