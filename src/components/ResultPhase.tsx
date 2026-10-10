import type { ScoreResult } from '../scoring/types'

interface Props {
  score: ScoreResult | null
  scoring: boolean
  error: string | null
  onBack: () => void
  onResubmit: () => void
  onOpenModel?: (no: number) => void
}

/** 提出後の採点結果 — 西部劇（Wanted / Saloon 掲示） */
export function ResultPhase({ score, scoring, error, onBack, onResubmit, onOpenModel }: Props) {
  if (!score && !scoring) {
    return (
      <div className="result-west result-west--empty" aria-label="採点結果">
        <div className="result-west__poster">
          <p className="result-west__wanted">NOTICE</p>
          <h2 className="result-west__title">まだ掲示がない</h2>
          {error && <p className="result-west__err">{error}</p>}
          <div className="result-west__actions">
            <button type="button" className="btn btn--primary" onClick={onBack}>
              ‹ 戻って台本を書く
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (scoring && !score) {
    return (
      <div className="result-west result-west--empty" aria-label="採点中">
        <div className="result-west__poster">
          <p className="result-west__wanted">HOLD UP…</p>
          <h2 className="result-west__title">採点中</h2>
          
        </div>
      </div>
    )
  }

  const s = score!

  return (
    <div className="result-west" aria-label="採点結果（西部劇掲示）">
      <div className="result-west__poster">
        <div className="result-west__brand">
          <span>SHINJICASE SALOON</span>
          <span className="result-west__star" aria-hidden="true">
            ★
          </span>
          <span>CASE BOARD</span>
        </div>
        <p className="result-west__wanted">WANTED — SCORE POSTED</p>
        <h2 className="result-west__title">採点結果</h2>
        {s.source === 'llama' && <p className="result-west__source">Llama{s.model ? ` · ${s.model}` : ''}</p>}
        <div className="result-west__hero">
          <div className="result-west__total">
            <span className="result-west__total-label">TOTAL</span>
            <span className="result-west__total-num">{s.total}</span>
            <span className="result-west__total-max">/ 100</span>
          </div>
          <div className={`result-west__grade result-west__grade--${s.grade}`}>{s.grade}</div>
          <div className="result-west__reach">
            <span className="result-west__total-label">到達度</span>
            <span className="result-west__reach-mark">{s.reach}</span>
            {s.closest && (
              <button type="button" className="result-west__closest" onClick={() => onOpenModel?.(s.closest!.no)}>
                近い：生徒{s.closest.no} ›
                <small>{s.closest.missing}</small>
              </button>
            )}
          </div>
        </div>

                <ul className="result-west__criteria">
          {s.criteria.map((c) => {
            const pts = c.score
            const pct = Math.max(0, Math.min(100, (pts / c.max) * 100))
            return (
              <li key={c.id} className="result-west__criterion">
                <div className="result-west__criterion-top">
                  <div>
                    <span className="result-west__criterion-jp">{c.name}</span>
                  </div>
                  <span className="result-west__criterion-pts">
                    {pts}
                    <span className="result-west__criterion-max">/{c.max}</span>
                  </span>
                </div>
                <p className="result-west__criterion-blurb">{c.feedback}</p>
                <div
                  className="result-west__bar"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={c.max}
                  aria-valuenow={pts}
                  aria-label={c.name}
                >
                  <div className="result-west__bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>

        <blockquote className="result-west__comment">
          <span className="result-west__comment-label">保安官の講評</span>
          <p>{s.comment}</p>
        </blockquote>

        {error && <p className="result-west__err">{error}</p>}

        <div className="result-west__actions">
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            ‹ 戻って台本を直す
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={scoring}
            onClick={onResubmit}
          >
            {scoring ? '採点中…' : '再提出して採点'}
          </button>
        </div>
      </div>
    </div>
  )
}
