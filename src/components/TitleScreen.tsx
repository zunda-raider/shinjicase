import { hasArchive } from '../data/archive'
import { SAMPLE_CASES } from '../data/cases'
import type { ArchiveTab } from './ArchiveViewer'

interface Props {
  activeId: string
  onOpen: (caseId: string) => void
  onArchive: (caseId: string, tab: ArchiveTab) => void
}

/** 最初の画面：捜査本部の事件ボード */
export function TitleScreen({ activeId, onOpen, onArchive }: Props) {
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
          <li key={c.id} className="title-case-wrap">
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
            <span className="title-case__archive">
              {(['GHOST', 'GOD'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`archive-badge archive-badge--${tab.toLowerCase()}`}
                  disabled={!hasArchive(c.id)}
                  title={tab === 'GHOST' ? '許容解' : '完全解'}
                  onClick={() => onArchive(c.id, tab)}
                >
                  {tab}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
