import type { Candidate, CandidateId } from '../types'

interface Props {
  suspects: Candidate[]
  maxPins: number
  motives: Record<CandidateId, string>
  onMotiveChange: (id: CandidateId, value: string) => void
  onUnpin: (id: CandidateId) => void
  canSubmit: boolean
  submitLabel: string
  onSubmit: () => void
  note?: string
  bonusNote?: string
}

/** 赤ピンを刺した容疑者と動機（一行）の欄 */
export function SuspectList({
  suspects,
  maxPins,
  motives,
  onMotiveChange,
  onUnpin,
  canSubmit,
  submitLabel,
  onSubmit,
  note,
  bonusNote,
}: Props) {
  return (
    <section className="suspect-list" aria-label="容疑者リスト">
      <header className="suspect-list__header">
        <span className="suspect-list__title">PRIME SUSPECTS</span>
        <span className="suspect-list__count">
          {suspects.length}/{maxPins}
        </span>
      </header>

      {suspects.length === 0 ? (
        <p className="suspect-list__empty">
          「容疑者モード」でツリーのカードをクリックすると赤ピンが刺さり、ここに並ぶ。
        </p>
      ) : (
        <ol className="suspect-list__items">
          {suspects.map((s, i) => (
            <li key={s.id} className="suspect-list__item">
              <div className="suspect-list__row">
                <span className="suspect-list__no">{i + 1}</span>
                <span className="suspect-list__name">{s.title}</span>
                <button
                  type="button"
                  className="suspect-list__unpin"
                  aria-label={`${s.title} のピンを外す`}
                  onClick={() => onUnpin(s.id)}
                >
                  ✕
                </button>
              </div>
              <span className="suspect-list__path">{s.summary}</span>
              <input
                type="text"
                value={motives[s.id] ?? ''}
                onChange={(e) => onMotiveChange(s.id, e.target.value)}
                placeholder="動機：なぜここがボトルネックか、一行で…"
                aria-label={`${s.title} の動機`}
                maxLength={120}
              />
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        className="btn btn--primary suspect-list__submit"
        disabled={!canSubmit}
        onClick={onSubmit}
      >
        {submitLabel}
      </button>
      {note && <span className="board__revise-hint">{note}</span>}
      {bonusNote && <span className="board__revise-won">{bonusNote}</span>}
    </section>
  )
}
