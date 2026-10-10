import {
  DEFAULT_METRIC,
  multiplierFromPercent,
  percentFromMultiplier,
} from '../data/intake'
import type { BusinessScale, IntakeData } from '../types'

interface Props {
  intake: IntakeData
  onChange: (next: IntakeData) => void
  onFillExample: () => void
}

/** 依頼人の調書の下で、プレイヤーが前提を設定する */
export function IntakeSetup({ intake, onChange, onFillExample }: Props) {
  const pct = intake.target.multiplier > 1 ? percentFromMultiplier(intake.target.multiplier) : ''
  const extras = intake.extras ?? []
  const set = (patch: Partial<IntakeData>) => onChange({ ...intake, ...patch, status: 'player' })

  function setScale(scale: BusinessScale) {
    set({ scale, storeCount: scale === 'chain' ? intake.storeCount ?? null : null })
  }

  function addExtra() {
    const n = extras.reduce((m, e) => Math.max(m, Number(e.id.replace(/\D/g, '')) || 0), 0) + 1
    set({ extras: [...extras, { id: `x${n}`, label: '', value: '' }] })
  }

  return (
    <section className="intake-setup" aria-label="前提の設定">
      <div className="intake-setup__head">
        <h3>前提</h3>
        <button type="button" className="btn btn--ghost intake-setup__example" onClick={onFillExample}>
          例の前提を入れる
        </button>
      </div>

      <div className="intake-setup__grid">
        <label className="intake-field intake-field--wide">
          <span>言葉の定義</span>
          <div className="intake-field__row">
            <input
              className="intake-field__term"
              value={intake.definition.term}
              placeholder={DEFAULT_METRIC}
              maxLength={20}
              aria-label="定義する言葉"
              onChange={(e) => set({ definition: { ...intake.definition, term: e.target.value } })}
            />
            <span className="intake-field__eq">＝</span>
            <input
              value={intake.definition.meaning}
              placeholder="範囲（例：給油＋コンビニ）"
              maxLength={120}
              aria-label="言葉の意味"
              onChange={(e) =>
                set({ definition: { ...intake.definition, meaning: e.target.value } })
              }
            />
          </div>
        </label>

        <label className="intake-field">
          <span>依頼人</span>
          <input
            value={intake.client.name}
            placeholder="誰から"
            maxLength={40}
            onChange={(e) => set({ client: { ...intake.client, name: e.target.value } })}
          />
        </label>
        <label className="intake-field">
          <span>立場</span>
          <input
            value={intake.client.role}
            placeholder="例：店舗オーナー"
            maxLength={40}
            onChange={(e) => set({ client: { ...intake.client, role: e.target.value } })}
          />
        </label>

        <label className="intake-field">
          <span>場所／エリア</span>
          <input
            value={intake.area ?? ''}
            placeholder="例：地方都市"
            maxLength={40}
            onChange={(e) => set({ area: e.target.value })}
          />
        </label>

        <div className="intake-field">
          <span>規模</span>
          <div className="intake-toggle" role="radiogroup" aria-label="規模">
            {(
              [
                ['single', '1店舗'],
                ['chain', 'チェーン'],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={intake.scale === v}
                className={`intake-toggle__opt ${intake.scale === v ? 'is-on' : ''}`}
                onClick={() => setScale(v)}
              >
                {l}
              </button>
            ))}
            {intake.scale === 'chain' && (
              <input
                type="number"
                min={2}
                className="intake-field__num"
                value={intake.storeCount ?? ''}
                placeholder="店舗数"
                aria-label="店舗数"
                onChange={(e) =>
                  set({ storeCount: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })
                }
              />
            )}
          </div>
        </div>

        <div className="intake-field intake-field--wide intake-target">
          <span>目標</span>
          <div className="intake-field__row">
            <input
              className="intake-field__term"
              value={intake.target.metric}
              placeholder={DEFAULT_METRIC}
              maxLength={20}
              aria-label="指標"
              onChange={(e) => set({ target: { ...intake.target, metric: e.target.value } })}
            />
            <span className="intake-field__eq">を</span>
            <Stepper
              label="年数"
              value={intake.target.years}
              min={1}
              max={10}
              suffix="年で"
              onChange={(years) => set({ target: { ...intake.target, years } })}
            />
            <input
              type="number"
              min={0}
              step={5}
              className="intake-field__num"
              value={pct}
              placeholder="30"
              aria-label="何％向上"
              onChange={(e) => {
                const p = e.target.value === '' ? 0 : Number(e.target.value)
                set({ target: { ...intake.target, multiplier: multiplierFromPercent(Math.max(0, p)) } })
              }}
            />
            <span className="intake-field__eq">％向上</span>
          </div>
        </div>

        {extras.map((x) => (
          <div key={x.id} className="intake-field intake-field--wide intake-extra">
            <div className="intake-field__row">
              <input
                className="intake-field__term"
                value={x.label}
                placeholder="項目"
                maxLength={20}
                aria-label="前提の項目"
                onChange={(e) =>
                  set({ extras: extras.map((y) => (y.id === x.id ? { ...y, label: e.target.value } : y)) })
                }
              />
              <span className="intake-field__eq">：</span>
              <input
                value={x.value}
                placeholder="内容"
                maxLength={80}
                aria-label="前提の内容"
                onChange={(e) =>
                  set({ extras: extras.map((y) => (y.id === x.id ? { ...y, value: e.target.value } : y)) })
                }
              />
              <button
                type="button"
                className="intake-extra__del"
                aria-label="この前提を削除"
                onClick={() => set({ extras: extras.filter((y) => y.id !== x.id) })}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn--ghost intake-setup__add" onClick={addExtra}>
        ＋前提を追加
      </button>
    </section>
  )
}

function Stepper({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  suffix: string
  onChange: (v: number) => void
}) {
  return (
    <span className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`${label}を減らす`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        －
      </button>
      <span className="stepper__val">{value}</span>
      <button type="button" aria-label={`${label}を増やす`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        ＋
      </button>
      <span className="intake-field__eq">{suffix}</span>
    </span>
  )
}
