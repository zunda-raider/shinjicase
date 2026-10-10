import { leaves, node, type ModelStudent } from '../types'

export const STUDENT3: ModelStudent = {
  no: 3,
  title: '駅利用者を呼び込み、高単価の購買につなげる',
  reach: { pattern: '3 強み・弱みから3方向', axis: '方向性のみ', grade: '△', missing: '比較と結論の前で終了' },
  premises: [
    ['対象', '地方中核都市の駅前にある老舗百貨店'],
    ['時間軸', '5年'],
    ['ゴール', '売上向上。利益は「値引きで体力を削らない」という制約条件として扱う〔質疑1〕'],
  ],
  target: { years: 5 },
  current: [
    '強み：駅前という立地／長年の常連客／上位顧客との関係／地元での信頼',
    '弱み：若い世代を取り込めていない／ネット販売への対応が遅れている／売場の使い方が今の消費行動に合っていない',
    '売上減少の主因は客数の減少。常連客は高齢化で自然に減っていき、単価もすでに高いので伸びしろが小さい〔質疑2・3〕',
  ],
  sheets: [
    {
      key: 'main',
      name: '客数×客単価',
      tree: node('売上', {
        op: 'mul',
        children: [
          node('客数', {
            op: 'add',
            splitQa: '質疑2',
            children: [
              node('既存客（自然減）'),
              node('新規客', {
                op: 'mul',
                splitQa: '質疑3・4',
                children: leaves('駅の通過人数', '入館率', '高単価売場への転換率'),
              }),
            ],
          }),
          node('客単価'),
        ],
      }),
    },
  ],
  focus: '駅利用者の入館率と、入口から高単価売場への転換',
  pins: [
    { sheet: 'main', label: '入館率' },
    { sheet: 'main', label: '高単価売場への転換率' },
  ],
  measures: [
    {
      name: 'A 来て楽しめる場',
      body: '飲食やイベントで、入りやすい入口を作る',
      node: { sheet: 'main', label: '入館率' },
      ghostNode: { sheet: 'main', label: '客数' },
    },
    {
      name: 'B 集客テナント',
      body: '賃料目的ではなく、館全体の客数を増やす手段として入れる〔質疑1〕',
      node: { sheet: 'main', label: '客数' },
    },
    {
      name: 'C 既存の売場と上位顧客',
      body: '売場と品揃えの見直し、上位顧客との関係強化',
      node: { sheet: 'main', label: '既存客（自然減）' },
      ghostNode: { sheet: 'main', label: '客数' },
    },
    {
      name: 'D 転換の仕組み',
      body: '決済時に自動でポイントがたまる会員の仕組みにし、誕生日や記念日に上の売場を案内する〔質疑4・5〕。飲食や雑貨のスタッフが贈答需要を拾い、高単価売場の担当者へつなぐ〔質疑4〕',
      node: { sheet: 'main', label: '高単価売場への転換率' },
      ghostNode: { sheet: 'main', label: '客単価' },
    },
    {
      name: 'E 値引きに頼らない関与',
      body: '会員への先行情報と先行体験。荷物の一時預かりや休憩スペースの優先案内〔質疑6〕',
      node: { sheet: 'main', label: '高単価売場への転換率' },
      ghostNode: { sheet: 'main', label: '客単価' },
    },
  ],
  notes: [],
}
