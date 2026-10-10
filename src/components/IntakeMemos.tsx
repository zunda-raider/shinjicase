import { formatClient, formatDefinition, formatTarget, otherPremises } from '../data/intake'
import type { IntakeData } from '../types'

interface Props {
  intake: IntakeData
}

/** 前提メモ。全フェーズでボード上部に貼っておく。 */
export function IntakeMemos({ intake }: Props) {
  const memos = [
    { key: 'definition', label: '言葉の定義', body: formatDefinition(intake).replace('＝', ' ＝ ') },
    { key: 'client', label: '依頼人', body: formatClient(intake) },
    { key: 'target', label: 'TARGET', body: formatTarget(intake.target) },
  ]
  const others = otherPremises(intake)

  return (
    <section className="intake-memos" aria-label="前提メモ">
      {memos.map((m) => (
        <div key={m.key} className={`intake-memo intake-memo--${m.key}`}>
          <span className="intake-memo__pin" aria-hidden="true" />
          <span className="intake-memo__label">{m.label}</span>
          <span className="intake-memo__body">{m.body}</span>
        </div>
      ))}
      {others.length > 0 && (
        <div className="intake-memo intake-memo--others">
          <span className="intake-memo__pin" aria-hidden="true" />
          <span className="intake-memo__label">その他の前提</span>
          <ul className="intake-memo__list">
            {others.map((o, i) => (
              <li key={i}>
                <b>{o.label}</b> {o.value}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
