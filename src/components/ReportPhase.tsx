import { GRADE_LABEL, namedAxes } from '../logic/warrant'
import type { RankedMeasure } from '../logic/warrant'
import type { ReportPitchCard, ReportState, WarrantState } from '../types'

interface Props {
  measures: RankedMeasure[]
  warrant: WarrantState
  report: ReportState
  onSwapMeasure: (index: number, measureKey: string) => void
  onSelectTab: (index: number) => void
  onChangeCard: (index: number, patch: Partial<Omit<ReportPitchCard, 'measureKey'>>) => void
  error: string | null
  /** 直近の提出があるとき、RESULT への導線を出す */
  hasScore: boolean
  onOpenResult: () => void
}

/** ⅵ 最終報告：施策ごとの1分台本。提出ボタンは常時表示 → RESULT へ。 */
export function ReportPhase({
  measures,
  warrant,
  report,
  onSwapMeasure,
  onSelectTab,
  onChangeCard,
  error,
  hasScore,
  onOpenResult,
}: Props) {
  const axes = namedAxes(warrant)
  const featuredKeys = new Set(report.cards.map((c) => c.measureKey))
  const active = report.cards[report.activeIndex]
  const activeMeasure = active
    ? measures.find((m) => m.key === active.measureKey)
    : undefined

  return (
    <div className="report">
      <section className="board report__main" aria-label="最終報告（1分台本）">
        {error && <p className="report-submit__err">{error}</p>}
        {hasScore && (
          <button type="button" className="report-score-toggle" onClick={onOpenResult}>
            前回の採点結果（RESULT）を見る ›
          </button>
        )}

        {report.cards.length === 0 ? (
          <p className="suspect-list__empty">施策なし</p>
        ) : report.cards.length > 0 && (
          <>
            <div className="report-tabs" role="tablist" aria-label="施策台本タブ">
              {report.cards.map((c, i) => {
                const m = measures.find((x) => x.key === c.measureKey)
                return (
                  <span key={c.measureKey} className="report-tab-wrap">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={report.activeIndex === i}
                    className={`report-tab ${report.activeIndex === i ? 'is-active' : ''}`}
                    onClick={() => onSelectTab(i)}
                  >
                    {i + 1}. {m?.text ?? c.measureKey}
                  </button>
                  {measures.length > report.cards.length && (
                    <select
                      className="report-tab__swap"
                      aria-label={`施策${i + 1}を入れ替え`}
                      title="施策を入れ替え"
                      value={c.measureKey}
                      onChange={(e) => onSwapMeasure(i, e.target.value)}
                    >
                      {measures
                        .filter((x) => x.key === c.measureKey || !featuredKeys.has(x.key))
                        .map((x) => (
                          <option key={x.key} value={x.key}>
                            {x.score === null ? '—' : `${x.rank}位`} {x.text}
                          </option>
                        ))}
                    </select>
                  )}
                  </span>
                )
              })}
            </div>

            {active && (
              <article className="report-pitch" role="tabpanel">
                <header className="report-pitch__head">
                  <span className="report-pitch__label">
                    施策{report.activeIndex + 1}
                    {activeMeasure
                      ? ` · ${activeMeasure.score === null ? '未評価' : `${activeMeasure.rank}位 ${activeMeasure.score}点`}`
                      : ''}
                  </span>
                  {activeMeasure && (
                    <div className="report-card__grades">
                      {axes.map((a) => {
                        const g = activeMeasure.grades[a.id]
                        return (
                          <span
                            key={a.id}
                            className={`warrant-rank__g warrant-grade--${g ?? 'empty'}`}
                            title={a.name}
                          >
                            {g ? GRADE_LABEL[g] : '・'}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </header>

                <div className="report-pitch__grid">
                  <label className="report-card__field">
                    <span>前提 · 言葉の定義</span>
                    <textarea
                      rows={2}
                      maxLength={200}
                      value={active.premiseDefinition}
                      onChange={(e) =>
                        onChangeCard(report.activeIndex, { premiseDefinition: e.target.value })
                      }
                    />
                  </label>
                  <label className="report-card__field">
                    <span>前提 · 依頼人</span>
                    <textarea
                      rows={1}
                      maxLength={120}
                      value={active.premiseClient}
                      onChange={(e) =>
                        onChangeCard(report.activeIndex, { premiseClient: e.target.value })
                      }
                    />
                  </label>
                  <label className="report-card__field">
                    <span>前提 · 目標</span>
                    <textarea
                      rows={1}
                      maxLength={120}
                      value={active.premiseTarget}
                      onChange={(e) =>
                        onChangeCard(report.activeIndex, { premiseTarget: e.target.value })
                      }
                    />
                  </label>
                  <label className="report-card__field report-pitch__span2">
                    <span>現状</span>
                    <textarea
                      rows={3}
                      maxLength={400}
                      value={active.current}
                      onChange={(e) =>
                        onChangeCard(report.activeIndex, { current: e.target.value })
                      }
                      placeholder="いま何が起きていて、何がボトルネックか…"
                    />
                  </label>
                  <label className="report-card__field report-pitch__span2">
                    <span>最終ゴール</span>
                    <textarea
                      rows={2}
                      maxLength={200}
                      value={active.goal}
                      onChange={(e) => onChangeCard(report.activeIndex, { goal: e.target.value })}
                      placeholder="到達したい姿・数値目標…"
                    />
                  </label>
                  <label className="report-card__field report-pitch__span2">
                    <span>施策 · ツリーのどこに効くか</span>
                    <textarea
                      rows={2}
                      maxLength={200}
                      value={active.where}
                      onChange={(e) => onChangeCard(report.activeIndex, { where: e.target.value })}
                      placeholder="例：1-1 既存顧客（顧客数×単価）"
                    />
                  </label>
                  <label className="report-card__field report-pitch__span2">
                    <span>効果</span>
                    <textarea
                      rows={3}
                      maxLength={300}
                      value={active.effect}
                      onChange={(e) =>
                        onChangeCard(report.activeIndex, { effect: e.target.value })
                      }
                      placeholder="この施策で何がどう良くなるか…"
                    />
                  </label>
                </div>
              </article>
            )}
          </>
        )}
      </section>
    </div>
  )
}
