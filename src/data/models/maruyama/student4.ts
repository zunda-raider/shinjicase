import { leaves, node, type ModelStudent } from '../types'

export const STUDENT4: ModelStudent = {
  no: 4,
  title: '平日の朝・昼に地域イベントで来店の目的を作る',
  reach: { pattern: '4 平日の朝・昼にイベント', axis: '客数', grade: '○', missing: '購買への転換が弱い' },
  premises: [
    ['顧客層', '近隣の中高年層が中心。若年層とファミリーは減少'],
    ['競合', 'モール、専門店、EC、SPA'],
    ['時間軸', '5年'],
    ['投資', '制約なし'],
  ],
  target: { years: 5 },
  current: ['休日は施策がなくても買い物目的の客が来る。平日は目的のある客しか来ない〔質疑1〕'],
  sheets: [
    {
      key: 'main',
      name: '客数×購買率×客単価',
      tree: node('売上', {
        op: 'mul',
        children: [
          node('客数', {
            op: 'mul',
            children: leaves('来店客数', '来店頻度（平日／休日 × 朝／昼／夜）'),
          }),
          node('購買率', {
            op: 'add',
            splitQa: '質疑2',
            children: leaves('イベント参加 → 館内の回遊 → 購入'),
          }),
          node('客単価', { op: 'mul', children: leaves('平均買上点数', '商品単価') }),
        ],
      }),
    },
  ],
  focus: '平日の朝・昼の客数と、イベント来場者の購買率',
  pins: [
    { sheet: 'main', label: '客数' },
    { sheet: 'main', label: '購買率' },
  ],
  measures: [
    {
      name: 'A 地域コミュニティ向けイベント',
      body: '平日の朝・昼に開き、地元ならではの体験価値で差別化する',
      node: { sheet: 'main', label: '客数' },
    },
    {
      name: 'B 購買までの導線',
      body: '当日限定で館内の複数店舗で使えるクーポン、フロアを回るスタンプラリー、一定額以上の購入で限定特典。イベントは集客の入口と位置づける〔質疑2〕',
      node: { sheet: 'main', label: '購買率' },
    },
    {
      name: 'C 体験価値への移行',
      body: 'クーポンは初回来店のきっかけに限定する。その後は工芸品の実演販売、生産者との交流会、百貨店ならではの接客でリピートにつなげる〔質疑3〕',
      node: { sheet: 'main', label: '来店頻度（平日／休日 × 朝／昼／夜）' },
    },
    {
      name: 'D まとめ買いセール',
      body: '買上点数を上げる',
      node: { sheet: 'main', label: '平均買上点数' },
    },
    {
      name: 'E テナントの見直し（中長期）',
      body: 'POSデータやアンケートで需要を分析し、地元の人気店、体験型テナント、飲食店に入れ替える〔質疑4〕',
      node: { sheet: 'main', label: '来店客数' },
    },
  ],
  notes: [
    {
      label: '順番',
      text: '短期の集客を優先する。テナントの入れ替えは投資と調整に時間がかかり、集客で得たデータをもとに見直したほうが判断が客観的になるため〔質疑5〕。データの偏りは、地域住民へのアンケート、競合施設の利用状況、人口構成のデータで補い、ポップアップストアで売れ行きを試してから本格的に入れ替える〔質疑6〕。',
    },
  ],
}
