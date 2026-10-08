import type { IntakeData } from '../types'

/**
 * ⅰ INTAKE の仮置きデータ。
 * 将来は調書のマーカー → 定義カード、依頼人カード選択、目標ダイヤル入力で
 * プレイヤーが作る（status: 'player'）。今は固定値で全フェーズの上部メモに使う。
 */
export const STUB_INTAKE: IntakeData = {
  status: 'stub',
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
}

export function formatTarget(t: IntakeData['target']): string {
  return `${t.metric} ×${t.multiplier}／${t.years}年`
}
