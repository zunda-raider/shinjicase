import type { SampleCase } from '../data/cases'
import { SAMPLE_CASES } from '../data/cases'
import { formatTarget } from '../data/intake'

interface Props {
  activeId: string
  onSelect: (caseId: string) => void
}

/** 事件選択（INTAKE トップ / 捜査ファイル一覧） */
export function CasePicker({ activeId, onSelect }: Props) {
  return (
    <section className="case-picker" aria-label="事件ファイルを選ぶ">
      <div className="board__header">
        <h2>CASE SELECT — 事件ファイル</h2>
        <span className="board__hint">{SAMPLE_CASES.length} 件のサンプル</span>
      </div>
      <p className="evidence__help">
        構造化の定番例を警察ドラマ風に収めたサンプル事件です。選ぶと前提メモが切り替わり、
        進捗は<strong>事件ごとに別保存</strong>されます。「例を読み込む」で推奨ツリーが入ります。
      </p>
      <ul className="case-picker__list">
        {SAMPLE_CASES.map((c) => (
          <li key={c.id}>
            <CaseCard case={c} active={c.id === activeId} onSelect={() => onSelect(c.id)} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function CaseCard({
  case: c,
  active,
  onSelect,
}: {
  case: SampleCase
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`case-card ${active ? 'is-active' : ''}`}
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
    >
      <div className="case-card__top">
        <span className="case-card__badge">CASE FILE</span>
        {active && <span className="case-card__now">捜査中</span>}
      </div>
      <h3 className="case-card__title">{c.label}</h3>
      <p className="case-card__tag">{c.tagline}</p>
      <p className="case-card__target">{formatTarget(c.intake.target)}</p>
      <p className="case-card__brief">{c.briefing}</p>
      <span className="case-card__cta">{active ? 'この事件を続行 ›' : 'この事件を開く ›'}</span>
    </button>
  )
}
