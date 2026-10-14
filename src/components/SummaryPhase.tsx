import type { RankedMeasure } from '../logic/warrant'
import type { SummaryPitchCard, SummaryState, WarrantState } from '../types'

interface Props {
  measures: RankedMeasure[]
  warrant: WarrantState
  summary: SummaryState
  onSwapMeasure: (index: number, measureKey: string) => void
  onSelectTab: (index: number) => void
  onChangeCard: (index: number, patch: Partial<Omit<SummaryPitchCard, 'measureKey'>>) => void
  error: string | null
}

const TAB_NAMES = ['メイン', 'サブ', 'サブ2']

/** WARRANT の メイン/サブ。どれも選んでいなければ OPERATION の順で メイン→サブ */
function rankName(m: RankedMeasure | undefined, i: number, anyRole: boolean): string {
  if (!m) return '？'
  if (m.role === 'main') return 'メイン'
  if (m.role === 'sub') return 'サブ'
  return anyRole ? '—' : TAB_NAMES[i] ?? '？'
}

/** ⅵ 要点整理：施策ごとの前提／現状／ゴール／施策／効果。 */
export function SummaryPhase({
  measures,
  warrant,
  summary,
  onSwapMeasure,
  onSelectTab,
  onChangeCard,
  error,
}: Props) {
  const anyRole = measures.some((m) => m.role)
  void warrant
  const featuredKeys = new Set(summary.cards.map((c) => c.measureKey))
  const active = summary.cards[summary.activeIndex]
  const activeMeasure = active
    ? measures.find((m) => m.key === active.measureKey)
    : undefined

  return (
    <div className="report">
      <section className="board report__main" aria-label="要点整理">
        {error && <p className="report-submit__err">{error}</p>}

        {summary.cards.length === 0 ? (
          <p className="suspect-list__empty">施策なし</p>
        ) : summary.cards.length > 0 && (
          <>
            <div className="report-tabs" role="tablist" aria-label="施策台本タブ">
              {summary.cards.map((c, i) => {
                return (
                  <span key={c.measureKey} className="report-tab-wrap">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={summary.activeIndex === i}
                    className={`report-tab ${summary.activeIndex === i ? 'is-active' : ''}`}
                    onClick={() => onSelectTab(i)}
                  >
                    {rankName(measures.find((x) => x.key === c.measureKey), i, anyRole)}
                  </button>
                  {measures.length > summary.cards.length && (
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
                            {x.role ? `${x.role === 'main' ? 'メイン' : 'サブ'}・` : ''}{x.text}
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
                  <span className="report-pitch__label">{rankName(activeMeasure, summary.activeIndex, anyRole)}</span>
                  {activeMeasure?.reason && <span className="report-pitch__why">{activeMeasure.reason}</span>}
                </header>

                <div className="report-pitch__grid">
                  <label className="report-card__field">
                    <span>前提 · 言葉の定義</span>
                    <textarea
                      rows={2}
                      maxLength={200}
                      value={active.premiseDefinition}
                      onChange={(e) =>
                        onChangeCard(summary.activeIndex, { premiseDefinition: e.target.value })
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
                        onChangeCard(summary.activeIndex, { premiseClient: e.target.value })
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
                        onChangeCard(summary.activeIndex, { premiseTarget: e.target.value })
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
                        onChangeCard(summary.activeIndex, { current: e.target.value })
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
                      onChange={(e) => onChangeCard(summary.activeIndex, { goal: e.target.value })}
                      placeholder="到達したい姿・数値目標…"
                    />
                  </label>
                  <label className="report-card__field report-pitch__span2">
                    <span>施策 · ツリーのどこに効くか</span>
                    <textarea
                      rows={2}
                      maxLength={200}
                      value={active.where}
                      onChange={(e) => onChangeCard(summary.activeIndex, { where: e.target.value })}
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
                        onChangeCard(summary.activeIndex, { effect: e.target.value })
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
