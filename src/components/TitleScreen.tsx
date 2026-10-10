import { SAMPLE_CASES } from '../data/cases'

interface Props {
  activeId: string
  onOpen: (caseId: string) => void
}

/** 最初の画面：捜査本部の事件ボード */
export function TitleScreen({ activeId, onOpen }: Props) {
  return (
    <div className="title-screen">
      <header className="title-screen__head">
        <span className="title-screen__precinct">CASE INTERVIEW PRECINCT</span>
        <h1 className="title-screen__logo">SHINJICASE</h1>
        <span className="title-screen__tape" aria-hidden="true">
          POLICE LINE — DO NOT CROSS — POLICE LINE — DO NOT CROSS
        </span>
      </header>
      <ul className="title-screen__cases" aria-label="事件ファイル">
        {SAMPLE_CASES.map((c, i) => (
          <li key={c.id}>
            <button
              type="button"
              className={`title-case ${c.id === activeId ? 'is-active' : ''}`}
              onClick={() => onOpen(c.id)}
            >
              <span className="title-case__no">FILE No.{String(i + 1).padStart(3, '0')}</span>
              <span className="title-case__name">{c.label}</span>
              <span className="title-case__tag">{c.odai}</span>
              <span className="title-case__stamp">{c.id === activeId ? '捜査中' : '未着手'}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
