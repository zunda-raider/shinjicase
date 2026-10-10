import type { ScoreResult } from '../scoring/types'

interface Props {
  score: ScoreResult | null
  scoring: boolean
  error: string | null
  onBack: () => void
  onResubmit: () => void
}

const CRITERIA: {
  key: keyof ScoreResult['breakdown']
  en: string
  jp: string
  max: number
  blurb: string
}[] = [
  {
    key: 'structure',
    en: 'STRUCTURE',
    jp: '構造化',
    max: 25,
    blurb: '切り口とツリーで問題を分解できているか',
  },
  {
    key: 'bottleneck',
    en: 'BOTTLENECK',
    jp: 'ボトルネック選定',
    max: 25,
    blurb: '容疑者（ボトルネック）の絞り込みと動機',
  },
  {
    key: 'measures',
    en: 'MEASURES',
    jp: '打ち手の対応',
    max: 25,
    blurb: '1分台本（前提〜効果）の揃いと説得力',
  },
  {
    key: 'evaluation',
    en: 'EVALUATION',
    jp: '評価の一貫性',
    max: 25,
    blurb: 'WARRANT の軸・○△✖・優先順位の一貫性',
  },
]

/** 提出後の採点結果 — 西部劇（Wanted / Saloon 掲示） */
export function ResultPhase({ score, scoring, error, onBack, onResubmit }: Props) {
  if (!score && !scoring) {
    return (
      <div className="result-west result-west--empty" aria-label="採点結果">
        <div className="result-west__poster">
          <p className="result-west__wanted">NOTICE</p>
          <h2 className="result-west__title">まだ掲示がない</h2>
          <p className="result-west__lede">
            REPORT で台本を書いて「提出して採点」すると、ここに点数と講評が貼り出されます。
          </p>
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
          <p className="result-west__lede">保安官が台本を読んでいる。しばらく待て。</p>
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
        <p className="result-west__source">
          {s.source === 'offline'
            ? 'オフライン採点（保安官代行）'
            : `Llama 講評${s.model ? ` · ${s.model}` : ''}`}
        </p>

        <div className="result-west__hero">
          <div className="result-west__total">
            <span className="result-west__total-label">TOTAL</span>
            <span className="result-west__total-num">{s.total}</span>
            <span className="result-west__total-max">/ 100</span>
          </div>
          <div className={`result-west__grade result-west__grade--${s.grade}`}>{s.grade}</div>
        </div>

        <h3 className="result-west__criteria-title">評価項目（各 0–25）</h3>
        <ul className="result-west__criteria">
          {CRITERIA.map((c) => {
            const pts = s.breakdown[c.key]
            const pct = Math.max(0, Math.min(100, (pts / c.max) * 100))
            return (
              <li key={c.key} className="result-west__criterion">
                <div className="result-west__criterion-top">
                  <div>
                    <span className="result-west__criterion-en">{c.en}</span>
                    <span className="result-west__criterion-jp">{c.jp}</span>
                  </div>
                  <span className="result-west__criterion-pts">
                    {pts}
                    <span className="result-west__criterion-max">/{c.max}</span>
                  </span>
                </div>
                <p className="result-west__criterion-blurb">{c.blurb}</p>
                <div
                  className="result-west__bar"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={c.max}
                  aria-valuenow={pts}
                  aria-label={c.jp}
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
