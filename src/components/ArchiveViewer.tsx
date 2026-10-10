import { marked } from 'marked'
import { useEffect, useMemo, useState } from 'react'
import { getArchiveMarkdown } from '../data/archive'
import { highlightQa, splitArchive, splitGodTitle } from '../logic/archive'

export type ArchiveTab = 'GHOST' | 'GOD'

interface Props {
  caseId: string
  caseLabel: string
  initialTab: ArchiveTab
  onClose: () => void
}

function md(src: string): string {
  return highlightQa(marked.parse(src, { gfm: true, async: false }) as string)
}

/** 模範解答アーカイブ（オーバーレイ） */
export function ArchiveViewer({ caseId, caseLabel, initialTab, onClose }: Props) {
  const raw = getArchiveMarkdown(caseId)
  const sections = useMemo(() => (raw ? splitArchive(raw) : null), [raw])
  const [tab, setTab] = useState<ArchiveTab>(initialTab)
  const [godIdx, setGodIdx] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const html = useMemo(() => {
    if (!sections) return ''
    if (tab === 'GHOST') return md(sections.ghost)
    const g = sections.god[godIdx]
    return g ? md(g.body) : ''
  }, [sections, tab, godIdx])

  return (
    <div className="archive" role="dialog" aria-modal="true" aria-label="ARCHIVE">
      <div className="archive__backdrop" onClick={onClose} />
      <section className="archive__panel">
        <header className="archive__head">
          <div>
            <span className="archive__badge">ARCHIVE</span>
            <h2 className="archive__title">{caseLabel}</h2>
            {sections?.title && <p className="archive__odai">{sections.title}</p>}
          </div>
          <button type="button" className="archive__close" aria-label="閉じる" onClick={onClose}>
            ✕
          </button>
        </header>

        {!sections ? (
          <p className="archive__empty">アーカイブなし</p>
        ) : (
          <>
            <div className="archive__tabs" role="tablist">
              {(['GHOST', 'GOD'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  className={`archive__tab archive__tab--${t.toLowerCase()} ${tab === t ? 'is-active' : ''}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                  <span className="archive__tab-sub">{t === 'GHOST' ? '許容解' : '完全解'}</span>
                </button>
              ))}
            </div>

            {tab === 'GOD' && (
              <div className="archive__subtabs" role="tablist" aria-label="完全解">
                {sections.god.map((g, i) => {
                  const { no, name } = splitGodTitle(g.title)
                  return (
                    <button
                      key={g.title}
                      type="button"
                      role="tab"
                      aria-selected={godIdx === i}
                      className={`archive__subtab ${godIdx === i ? 'is-active' : ''}`}
                      title={name}
                      onClick={() => setGodIdx(i)}
                    >
                      <b>{no}</b>
                      <span>{name}</span>
                    </button>
                  )
                })}
              </div>
            )}

            <article
              className={`archive__body md ${tab === 'GOD' ? 'is-god' : 'is-ghost'}`}
              // 中身はリポジトリ内の Markdown（ユーザー作成）
              dangerouslySetInnerHTML={{ __html: html }}
            />
            {tab === 'GOD' && sections.godNote && godIdx === sections.god.length - 1 && (
              <div className="archive__note md" dangerouslySetInnerHTML={{ __html: md(sections.godNote) }} />
            )}
          </>
        )}
      </section>
    </div>
  )
}
