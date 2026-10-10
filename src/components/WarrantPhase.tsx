import { useMemo, useState } from 'react'
import {
  GRADE_LABEL,
  GRADES,
  MAX_AXES,
  MIN_AXES,
  collectMeasures,
  isFullyRated,
  namedAxes,
  rankMeasures,
  warrantCaptainLines,
} from '../logic/warrant'
import type { AxisId, EvidenceWorkspace, Grade, MeasureKey, WarrantState } from '../types'

interface Props {
  ws: EvidenceWorkspace
  pins: string[]
  warrant: WarrantState
  onAddAxis: () => void
  onRenameAxis: (id: AxisId, name: string) => void
  onRemoveAxis: (id: AxisId) => void
  onRate: (key: MeasureKey, axisId: AxisId, grade: Grade) => void
  onFinalAnswer: (text: string) => void
}

/** ⅴ 打ち手評価：自分で立てた軸で施策に ○△✖ をつける */
export function WarrantPhase({
  ws,
  pins,
  warrant,
  onAddAxis,
  onRenameAxis,
  onRemoveAxis,
  onRate,
  onFinalAnswer,
}: Props) {
  const [suspectsOnly, setSuspectsOnly] = useState(true)
  const allMeasures = useMemo(() => collectMeasures(ws, pins), [ws, pins])
  const measures = useMemo(
    () => (suspectsOnly ? allMeasures.filter((m) => m.pinned) : allMeasures),
    [allMeasures, suspectsOnly],
  )
  const axes = warrant.axes
  const named = namedAxes(warrant)
  const canRate = named.length >= MIN_AXES && named.length === axes.length
  const ranked = useMemo(() => rankMeasures(warrant, measures), [warrant, measures])
  const captainLines = useMemo(
    () => warrantCaptainLines(warrant, measures),
    [warrant, measures],
  )
  const approved =
    canRate &&
    measures.length > 0 &&
    measures.every((m) => isFullyRated(warrant, m.key, named))

  const multiSheet = ws.sheets.length > 1

  return (
    <div className="warrant">
      <section className="board warrant__main" aria-label="令状請求">
        <div className="board__header">
          <h2>評価軸と評点（○△✖）</h2>
          <label className="operation__filter">
            <input
              type="checkbox"
              checked={suspectsOnly}
              onChange={(e) => setSuspectsOnly(e.target.checked)}
            />
            容疑者の施策のみ
            {!suspectsOnly && <span className="warrant__hint-inline">（全施策を表示中）</span>}
          </label>
        </div>

        <section className="warrant-axes" aria-label="評価軸">
          <div className="warrant-axes__head">
            <h3>評価軸（{axes.length}/{MAX_AXES}）</h3>
          </div>
          <ul className="warrant-axes__list">
            {axes.map((a, i) => (
              <li key={a.id}>
                <span className="warrant-axes__idx">{i + 1}</span>
                <input
                  type="text"
                  value={a.name}
                  placeholder={`軸${i + 1}の名前…`}
                  maxLength={20}
                  aria-label={`評価軸 ${i + 1}`}
                  onChange={(e) => onRenameAxis(a.id, e.target.value)}
                />
                <button
                  type="button"
                  className="warrant-axes__del"
                  disabled={axes.length <= MIN_AXES}
                  title={axes.length <= MIN_AXES ? `最低 ${MIN_AXES} 本は必要` : 'この軸を削除'}
                  aria-label={`${a.name || `軸${i + 1}`} を削除`}
                  onClick={() => onRemoveAxis(a.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {axes.length < MAX_AXES && (
            <button type="button" className="btn btn--ghost warrant-axes__add" onClick={onAddAxis}>
              ＋軸を追加
            </button>
          )}
          {!canRate && (
            <p className="warrant-axes__warn">
              {axes.length < MIN_AXES
                ? `軸を ${MIN_AXES} 本以上にしてください。`
                : 'すべての軸に名前をつけてから評点できます。'}
            </p>
          )}
        </section>

        {measures.length === 0 ? (
          <p className="suspect-list__empty">
            {allMeasures.length === 0
              ? '施策なし'
              : '容疑者の施策なし'}
          </p>
        ) : (
          <div className="warrant-matrix-wrap">
            <table className="warrant-matrix">
              <thead>
                <tr>
                  <th scope="col" className="warrant-matrix__measure-h">
                    施策
                  </th>
                  {axes.map((a) => (
                    <th key={a.id} scope="col" className="warrant-matrix__axis-h">
                      {a.name.trim() || '（未命名）'}
                    </th>
                  ))}
                  <th scope="col" className="warrant-matrix__score-h">
                    合計
                  </th>
                </tr>
              </thead>
              <tbody>
                {measures.map((m) => {
                  const row = warrant.ratings[m.key] ?? {}
                  const score = ranked.find((r) => r.key === m.key)?.score
                  return (
                    <tr
                      key={m.key}
                      className={m.pinned ? 'is-suspect' : ''}
                      data-measure={m.key}
                    >
                      <th scope="row" className="warrant-matrix__measure">
                        <span className="warrant-matrix__no">{m.number || '—'}</span>
                        <span className="warrant-matrix__body">
                          <span className="warrant-matrix__node">
                            {m.nodeLabel}
                            {m.pinNo !== undefined && (
                              <span className="warrant-matrix__pin"> 📌{m.pinNo}</span>
                            )}
                          </span>
                          <span className="warrant-matrix__text">{m.text}</span>
                          {multiSheet && (
                            <span className="warrant-matrix__sheet">{m.sheetName}</span>
                          )}
                        </span>
                      </th>
                      {axes.map((a) => (
                        <td key={a.id} className="warrant-matrix__cell">
                          <div
                            className="warrant-grades"
                            role="group"
                            aria-label={`${m.text} × ${a.name || '軸'}`}
                          >
                            {GRADES.map((g) => {
                              const active = row[a.id] === g
                              return (
                                <button
                                  key={g}
                                  type="button"
                                  className={`warrant-grade warrant-grade--${g} ${active ? 'is-active' : ''}`}
                                  aria-pressed={active}
                                  disabled={!canRate}
                                  title={GRADE_LABEL[g]}
                                  onClick={() => onRate(m.key, a.id, g)}
                                >
                                  {GRADE_LABEL[g]}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                      ))}
                      <td className="warrant-matrix__score">
                        {score === null || score === undefined ? '—' : score}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <section className="warrant-answer" aria-label="最終回答">
          <h3>最終回答（3行）</h3>
          <textarea
            value={warrant.finalAnswer}
            onChange={(e) => onFinalAnswer(e.target.value)}
            rows={3}
            maxLength={400}
            placeholder="優先する施策とその理由を、3行で書いて提出する想定…"
          />
        </section>
      </section>

      <aside className="warrant__side">
        <div className="operation-captain">
          <div className="operation-captain__head">
            <span className="captain-panel__avatar" aria-hidden="true">
              ★
            </span>
            <span className="captain-panel__rank">CAPTAIN</span>
            {approved && <span className="warrant-approved">令状承認可</span>}
          </div>
          <ul className="operation-captain__lines">
            {captainLines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>

        <section className="warrant-rank" aria-label="優先順位">
          <h3>優先順位</h3>
          {ranked.length === 0 ? (
            <p className="suspect-list__empty">施策がまだない。</p>
          ) : (
            <ol className="warrant-rank__list">
              {ranked.map((r) => (
                <li key={r.key} className={r.score === null ? 'is-pending' : ''}>
                  <span className="warrant-rank__pos">
                    {r.score === null ? '—' : `${r.rank}位`}
                  </span>
                  <span className="warrant-rank__body">
                    <span className="warrant-rank__text">{r.text}</span>
                    <span className="warrant-rank__meta">
                      {r.number} {r.nodeLabel}
                      {r.pinNo !== undefined ? ` 📌${r.pinNo}` : ''}
                      {multiSheet ? ` ／ ${r.sheetName}` : ''}
                    </span>
                    <span className="warrant-rank__grades">
                      {axes.map((a) => (
                        <span
                          key={a.id}
                          className={`warrant-rank__g warrant-grade--${r.grades[a.id] ?? 'empty'}`}
                          title={a.name}
                        >
                          {r.grades[a.id] ? GRADE_LABEL[r.grades[a.id]!] : '・'}
                        </span>
                      ))}
                      <span className="warrant-rank__sum">
                        {r.score === null ? '未' : `${r.score}点`}
                      </span>
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </aside>
    </div>
  )
}
