import type { ModelReview } from '../logic/modelReview'
import { QaText } from './QaText'

/** GHOST/GOD の講評（点数なし。原文・ルーブリックのみ） */
export function ReviewPanel({ review, mode }: { review: ModelReview; mode: 'GHOST' | 'GOD' }) {
  return (
    <section className="review" aria-label="講評">
      <h2 className="review__title">講評</h2>
      <p className="review__lead">
        <b>{mode === 'GHOST' ? '許容解' : '完全解'}</b> — {review.title}
      </p>

      {review.lineage && (
        <div className="review__block">
          <h3>系統</h3>
          <p>
            {review.lineage.name}
            <span className="review__muted"> — {review.lineage.reason}</span>
          </p>
        </div>
      )}

      {review.focus && (
        <div className="review__block">
          <h3>狙い</h3>
          <p>
            <QaText text={review.focus} />
          </p>
        </div>
      )}

      {review.reach && (
        <div className="review__block">
          <h3>到達度（許容解表）</h3>
          <p>
            {review.reach.grade} · {review.reach.pattern}
            {review.reach.missing && review.reach.missing !== '—' ? (
              <span className="review__muted"> — 足りない点: {review.reach.missing}</span>
            ) : null}
          </p>
        </div>
      )}

      {review.passMap.length > 0 && (
        <div className="review__block">
          <h3>合格条件との対応</h3>
          <ul className="review__list">
            {review.passMap.map((row) => (
              <li key={row.name}>
                <b>{row.name}</b>
                <span className="review__muted"> — {row.passLine}</span>
                {row.evidence ? (
                  <div className="review__ev">
                    <QaText text={row.evidence} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode === 'GOD' && (
        <div className="review__block">
          <h3>質疑で加わった点</h3>
          {review.qaAdded.length === 0 ? (
            <p className="review__muted">〔質疑〕の記載なし</p>
          ) : (
            <ul className="review__list">
              {review.qaAdded.map((q, i) => (
                <li key={`${q.tag}-${i}`}>
                  <span className="qa-chip">{q.tag.replace(/[〔〕]/g, '')}</span>{' '}
                  <QaText text={q.excerpt} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
