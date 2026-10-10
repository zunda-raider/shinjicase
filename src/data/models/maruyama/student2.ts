import { leaves, node, type ModelStudent } from '../types'

export const STUDENT2: ModelStudent = {
  no: 2,
  title: '外商の深掘りで客単価を最大化',
  reach: { pattern: '2 外商の深掘り', axis: '客単価', grade: '△', missing: '具体策の前で終了' },
  premises: [
    ['対象', '地方中核都市の駅前にある老舗百貨店1店舗'],
    ['時間軸', '5年'],
    ['ゴール', '黒字化。必要な増収を5〜10億円と置く〔質疑1〕'],
    ['現状の数字', '売上150億円、来店客数400万人、客単価3,750円'],
    ['収支', '固定費が重く、ほぼ均衡からやや赤字'],
    ['競合', 'モール、専門店、EC、SPA'],
  ],
  scale: 'single',
  target: { years: 5 },
  current: [
    '客単価が一般の小売店並みで、百貨店の強みが数字に出ていない',
    '客数を増やす打ち手は、モール、SPA、ECと正面からぶつかるうえ、人口も減っている',
  ],
  sheets: [
    {
      key: 'main',
      name: '客数×客単価',
      tree: node('売上', { op: 'mul', children: leaves('客数 400万人', '客単価 3,750円') }),
    },
    {
      key: 'gaisho',
      name: '一般売場＋外商',
      tree: node('売上', {
        op: 'add',
        children: [
          node('一般売場 112.5億円'),
          node('外商 37.5億円（売上の25%）', {
            op: 'mul',
            splitQa: '質疑2',
            children: [
              node('外商顧客 5,000人', {
                op: 'add',
                splitQa: '質疑3',
                children: leaves('既存', '新規の4つの出どころ'),
              }),
              node('年間購入額 75万円', {
                op: 'add',
                splitQa: '質疑4',
                children: leaves('純増する4つのカテゴリ'),
              }),
            ],
          }),
        ],
      }),
    },
  ],
  focus: '外商顧客の年間購入額と、外商顧客数',
  pins: [
    { sheet: 'gaisho', label: '年間購入額 75万円' },
    { sheet: 'gaisho', label: '外商顧客 5,000人' },
  ],
  measures: [
    {
      name: 'A コンシェルジュ型の外商',
      body: '家族構成やライフイベントの予定を把握したうえで提案する〔質疑5〕。純増させる購入は、これまで店で買っていなかった高額品、ライフイベント（リフォーム、贈与）、経営する法人としての需要、都市部やECに流れていた高級品・限定品の取り戻し〔質疑4〕',
      node: { sheet: 'gaisho', label: '年間購入額 75万円' },
      ghostNode: { sheet: 'gaisho', label: '外商 37.5億円（売上の25%）' },
    },
    {
      name: 'B 外商化する対象',
      body: '①一般売場の優良顧客（すぐ着手）、②地元の事業オーナーや開業医、③金融機関や士業からの紹介（②③は1〜2年）、④県外に住む地元出身者（3〜5年）〔質疑3〕',
      node: { sheet: 'gaisho', label: '外商顧客 5,000人' },
      ghostNode: { sheet: 'gaisho', label: '外商 37.5億円（売上の25%）' },
    },
    {
      name: 'C 選ばれる理由',
      body: '個人に合わせた目利きと提案、地元ですぐに失敗なく済ませられること、地元での信用と格式〔質疑5〕',
      node: { sheet: 'gaisho', label: '外商 37.5億円（売上の25%）' },
    },
    {
      name: 'D 組織づくり',
      body: '1年目は既存顧客で試して型にする。2〜3年目はマニュアル化して横展開する。4〜5年目に組織に定着させる〔質疑6〕',
      node: { sheet: 'gaisho', label: '外商 37.5億円（売上の25%）' },
    },
  ],
  notes: [
    {
      label: '試算',
      text: '外商37.5億円に対して、年間購入額＋10%で＋3.75億円、外商顧客数＋10%で＋3.75億円。合計＋7.5億円で、5〜10億円の幅に収まる。2〜3年目は目標の半分程度〔質疑2・6〕。',
    },
  ],
}
