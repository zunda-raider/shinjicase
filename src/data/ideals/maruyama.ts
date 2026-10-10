import type { IdealAnswer } from './types'

/** まるやま百貨店（地方百貨店）。出典: src/data/archive/maruyama-department-store.md の許容解（GHOST） */
export const MARUYAMA_IDEAL: IdealAnswer = {
  caseId: 'local-dept',
  odai: '地方百貨店の売上を向上させる生き残り戦略を提案してください',
  requiredElements: [
    {
      id: 'premise',
      name: '前提',
      passLine:
        '立地、顧客層、期間のうち2つ以上を確認するか、自分で置く。ゴールを置く（数値が望ましい）',
    },
    { id: 'decomposition', name: '分解', passLine: '売上を、下の表のいずれかの形で分解する' },
    {
      id: 'focusReason',
      name: '絞り込みの理由',
      passLine: 'どの箱を狙うかを、立地・顧客・競合から理由づける',
    },
    { id: 'measures', name: '施策', passLine: '狙った箱にひも付いた具体策を2つ以上出す' },
    { id: 'conclusionFirst', name: '話し方', passLine: '結論から話す' },
  ],
  acceptedFirstDecompositions: [
    'チャネル別：店頭＋外商＋ギフト（＋催事）',
    '客数×客単価',
    '客数×購買率×客単価（平日／休日×時間帯で内訳）',
    '来店客数×購買率×客単価×来店頻度',
    'カテゴリ別：衣料品／食品／化粧品／その他',
  ],
  hotSpots: [
    {
      id: 'unit-price',
      name: '客単価を深掘りする',
      axes: ['外商', 'ギフト', '法人'],
      reason:
        '人口減少と競合で客数は伸ばしにくい。百貨店の信頼（品質保証、包装、配送）が最も活きる',
      keywords: ['外商', 'ギフト', '法人', '贈答', '包装', '配送', '客単価'],
    },
    {
      id: 'reason-to-visit',
      name: '来店の理由を作る',
      axes: ['食品', '催事', 'イベント', 'テナント'],
      reason:
        '百貨店に行く理由がない／平日の日中が空いている。入口から化粧品・雑貨などへの回遊につなげる一言がある',
      keywords: ['食品', '催事', 'イベント', 'テナント', '回遊', '来店頻度', '化粧品', '雑貨'],
    },
  ],
  rejected: [
    { text: '衣料品でSPAやECと価格で正面から勝負する', keywords: ['SPAと価格', 'ECと価格'] },
    { text: '不動産の賃料収入を「売上向上」として扱う', keywords: ['賃料収入'] },
    { text: '値引きを中心に据える', keywords: ['値引き', '割引', 'セール'] },
  ],
}
