import type { ExtraPremise, IntakeData } from '../types'

/**
 * テスト・例用の前提（ブルーオアシス）。
 * 実プレイではプレイヤーが INTAKE で設定する（status: 'player'）。
 */
export const STUB_INTAKE: IntakeData = {
  status: 'player',
  definition: {
    term: '売上',
    meaning: '給油＋併設コンビニ等、店舗の売上合計',
  },
  client: {
    name: 'ブルーオアシス',
    role: '店舗オーナーからの相談',
  },
  target: {
    metric: '売上',
    multiplier: 1.3,
    years: 3,
  },
  area: '地方都市・郊外',
  scale: 'single',
  storeCount: null,
  extras: [],
}

export const DEFAULT_METRIC = '売上'

/** 空の前提（プレイヤー入力前） */
export function emptyIntake(statement?: string): IntakeData {
  return {
    status: 'player',
    definition: { term: DEFAULT_METRIC, meaning: '' },
    client: { name: '', role: '' },
    target: { metric: DEFAULT_METRIC, multiplier: 1, years: 3 },
    area: '',
    scale: null,
    storeCount: null,
    extras: [],
    statement,
  }
}

/** ×1.3 → 30 */
export function percentFromMultiplier(m: number): number {
  return Math.round((m - 1) * 1000) / 10
}

/** 30 → ×1.3 */
export function multiplierFromPercent(p: number): number {
  return Math.round((1 + p / 100) * 1000) / 1000
}

export function formatTarget(t: IntakeData['target']): string {
  const metric = t.metric.trim() || DEFAULT_METRIC
  if (!(t.multiplier > 1)) return `${metric} ×?／${t.years}年`
  return `${metric} ×${t.multiplier}（+${percentFromMultiplier(t.multiplier)}%）／${t.years}年`
}

export function formatDefinition(i: IntakeData): string {
  const term = i.definition.term.trim() || i.target.metric.trim() || DEFAULT_METRIC
  const meaning = i.definition.meaning.trim()
  return meaning ? `${term}＝${meaning}` : `${term}＝（未定義）`
}

export function formatClient(i: IntakeData): string {
  const name = i.client.name.trim()
  const role = i.client.role.trim()
  if (!name && !role) return '（未設定）'
  return role ? `${name || '？'}（${role}）` : name
}

export function formatScale(i: IntakeData): string {
  if (i.scale === 'chain') return i.storeCount ? `チェーン（${i.storeCount}店舗）` : 'チェーン'
  if (i.scale === 'single') return '1店舗'
  return ''
}

/** 定義・依頼人・TARGET 以外の前提を「ラベル：値」で並べる */
export function otherPremises(i: IntakeData): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = []
  if (i.area?.trim()) out.push({ label: '場所', value: i.area.trim() })
  const sc = formatScale(i)
  if (sc) out.push({ label: '規模', value: sc })
  for (const e of i.extras ?? []) {
    if (e.label.trim() || e.value.trim()) {
      out.push({ label: e.label.trim() || '前提', value: e.value.trim() })
    }
  }
  return out
}

function isStr(v: unknown): v is string {
  return typeof v === 'string'
}

function isExtras(v: unknown): v is ExtraPremise[] {
  return (
    Array.isArray(v) &&
    v.every(
      (e) =>
        e &&
        typeof e === 'object' &&
        isStr((e as ExtraPremise).id) &&
        isStr((e as ExtraPremise).label) &&
        isStr((e as ExtraPremise).value),
    )
  )
}

/** 保存データを読み込む。壊れていれば null。旧 stub は player に移行。 */
export function parseIntake(v: unknown, statement?: string): IntakeData | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Partial<IntakeData>
  const d = o.definition
  const c = o.client
  const t = o.target
  if (!d || !isStr(d.term) || !isStr(d.meaning)) return null
  if (!c || !isStr(c.name) || !isStr(c.role)) return null
  if (!t || !isStr(t.metric) || typeof t.multiplier !== 'number' || typeof t.years !== 'number') {
    return null
  }
  return {
    status: 'player',
    definition: { term: d.term, meaning: d.meaning },
    client: { name: c.name, role: c.role },
    target: { metric: t.metric, multiplier: t.multiplier, years: t.years },
    area: isStr(o.area) ? o.area : '',
    scale: o.scale === 'chain' || o.scale === 'single' ? o.scale : null,
    storeCount: typeof o.storeCount === 'number' ? o.storeCount : null,
    extras: isExtras(o.extras) ? o.extras : [],
    statement,
  }
}

export function intakeMetric(i: IntakeData): string {
  return i.target.metric.trim() || DEFAULT_METRIC
}
