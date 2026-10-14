import type { ReportScriptState } from '../types'

interface Props {
  script: ReportScriptState
  onChange: (text: string) => void
  error: string | null
  submitted?: boolean
  readOnly?: boolean
}

/** ⅶ 最終報告：1分で読み上げる通し台本 */
export function ReportPhase({ script, onChange, error, submitted, readOnly }: Props) {
  return (
    <section className="board report-prose" aria-label="最終報告（1分台本）">
      {error && <p className="report-submit__err">{error}</p>}
      {submitted && !readOnly && <p className="report-done">提出済み</p>}
      {readOnly ? (
        <div className="report-prose__body">
          {script.text.trim() ? script.text : <span className="model-empty">記載なし</span>}
        </div>
      ) : (
        <textarea
          className="report-prose__ta"
          rows={16}
          maxLength={4000}
          aria-label="1分台本"
          value={script.text}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </section>
  )
}
