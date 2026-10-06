import type { CaseData } from '../types'

/** 架空ケース：郊外ガソリンスタンドの売上急減 */
export const SAMPLE_CASE: CaseData = {
  id: 'gas-station-revenue',
  title: 'CASE FILE: 郊外GS「ブルーオアシス」売上急減',
  briefing:
    '過去6ヶ月で給油売上▲18%。本部は「犯人＝ボトルネック」の特定を要求。候補カードから最大3名をPRIME SUSPECTとしてピン留めし、動機（仮説）を記せ。',
  idealPrimeCount: 3,
  candidates: [
    {
      id: 'competitor',
      title: '近隣セルフ店の出店',
      summary: '3km圏内に低価格セルフGSが開業。価格訴求で客が流出した可能性。',
      category: '外部環境',
    },
    {
      id: 'pricing',
      title: '燃料価格設定ミス',
      summary: '競合比で常に+3〜5円。値下げ権限が店長になく反応が遅い。',
      category: '価格',
    },
    {
      id: 'cvs-service',
      title: '併設コンビニの質低下',
      summary: '品切れ・清掃不良で「ついで買い」が減少。給油以外の来店動機が弱い。',
      category: '非給油売上',
    },
    {
      id: 'traffic',
      title: '立地・交通量の変化',
      summary: '近隣道路工事で通行量が一時低下。工事終了後も戻っていないとの報告あり。',
      category: '立地',
    },
    {
      id: 'ops',
      title: 'スタッフ接客・オペレーション',
      summary: '満タン接客の省略、洗浄待ち行列。口コミで評価が急落。',
      category: 'オペ',
    },
    {
      id: 'equipment',
      title: '給油機の故障増加',
      summary: '2番レーンが月に数回ダウン。ピーク時の処理能力がボトルネック化。',
      category: '設備',
    },
  ],
}
