import { formatTarget } from '../data/intake'
import type { IntakeData } from '../types'

interface Props {
  intake: IntakeData
}

/** ⅰ INTAKE の3枚（定義・依頼人・目標）。全フェーズでボード上部に貼っておく。 */
export function IntakeMemos({ intake }: Props) {
  const memos = [
    {
      key: 'definition',
      label: '言葉の定義',
      body: `${intake.definition.term} ＝ ${intake.definition.meaning}`,
    },
    {
      key: 'client',
      label: '依頼人',
      body: `${intake.client.name}（${intake.client.role}）`,
    },
    {
      key: 'target',
      label: 'TARGET',
      body: formatTarget(intake.target),
    },
  ]

  return (
    <section className="intake-memos" aria-label="事件受理メモ（前提）">
      {memos.map((m) => (
        <div key={m.key} className={`intake-memo intake-memo--${m.key}`}>
          <span className="intake-memo__pin" aria-hidden="true" />
          <span className="intake-memo__label">{m.label}</span>
          <span className="intake-memo__body">{m.body}</span>
        </div>
      ))}
      {intake.status === 'stub' && (
        <span className="intake-memos__stamp" title="ⅰ INTAKE は未実装。仮置きの値です。">
          仮置き
        </span>
      )}
    </section>
  )
}
