import { leaves, node, type ModelStudent } from '../types'

const seg = (morningExtra = false) =>
  node('売上', {
    op: 'add',
    children: [
      node('通勤客', {
        op: 'add',
        children: [
          morningExtra
            ? node('朝', {
                op: 'mul',
                children: [
                  node('レジの回転率', { kind: 'extract', op: 'mul', qa: '質疑2', children: leaves('レジ台数', '稼働率') }),
                ],
              })
            : node('朝'),
          node('昼'),
          node('夜'),
        ],
      }),
      node('住民', { op: 'add', children: leaves('朝', '昼', '夜') }),
    ],
  })

const main = node('売上', { op: 'mul', children: leaves('客数', '単価', '頻度') })

export const STUDENT1: ModelStudent = {
  no: 1,
  title: '朝の通勤客の客単価',
  premises: [
    ['対象', '1店舗'],
    ['立地', '都市部の住宅街とオフィスが混在するエリア'],
    ['客層', '通勤客と住民'],
    ['時間軸', '3年'],
    ['ゴール', '売上20%増（1.2倍）'],
  ],
  scale: 'single',
  target: { multiplier: 1.2, years: 3 },
  current: ['客数はコンビニという業態上、差別化が難しく伸ばしにくい'],
  sheets: [
    { key: 'main', name: '客数×単価×頻度', tree: main },
    { key: 'seg', name: '客層×時間帯', tree: seg(true) },
  ],
  focus: '最も解くべき課題：朝のピーク時の客数に対して単価が低いこと。それを支える回転率〔質疑3〕',
  pins: [
    { sheet: 'seg', label: '通勤客/朝' },
    { sheet: 'main', label: '単価' },
    { sheet: 'seg', label: 'レジの回転率' },
  ],
  measures: [
    {
      name: 'A 朝食とコーヒーのセット特典',
      reason: 'コーヒーの原価は1杯20円程度なので、単価の上昇で回収できる〔質疑1〕',
      body: '1,000円以上の購入でコーヒーL無料。コーヒーの原価は1杯20円程度なので、単価の上昇で回収できる〔質疑1〕',
      node: { sheet: 'seg', label: '通勤客/朝' },
    },
    {
      name: 'B もう1品をレジ前に',
      body: 'ホットスナックの声かけ、夏はスポーツドリンクを店頭に、冷感シートをレジ前に〔質疑1〕',
      node: { sheet: 'seg', label: '通勤客/朝' },
    },
    {
      name: 'C 回転率の確保',
      body: 'オペレーションの再確認、マニュアルの整備。混雑に応じてセルフレジを追加する（本部の補助も活用）〔質疑2・3〕',
      node: { sheet: 'seg', label: 'レジの回転率' },
    },
    {
      name: 'D 競合への差別化',
      body: '他のコンビニには、コーヒー特典と商品配置（お酒の近くにおつまみ、タバコの近くにライター、右回りの導線）で差をつける。カフェには、コーヒーとパンなどの朝食を一緒に選べる強みで対抗する〔質疑4〕',
      node: { sheet: 'seg', label: '通勤客/朝' },
    },
    { name: 'E 夜のセット特典', body: '1,200円以上の購入でデザート1品無料〔質疑5〕', node: { sheet: 'main', label: '単価' } },
    { name: 'F アレンジレシピの掲示', body: '例：チャーハン×チーズ。まとめ買いを促す〔質疑5〕', node: { sheet: 'main', label: '単価' } },
    {
      name: 'G 別の方向性',
      body: '法人向けの定期配達。週ごとにカタログを渡し、決まった曜日に配達して手数料を取る〔質疑6〕',
      node: { sheet: 'main', label: '客数' },
    },
  ],
  factCards: [
    { category: '課題', text: '客数は業態上、差別化しにくく伸ばしにくい' },
    { category: '課題', text: '朝のピークの客数に対して単価が低い', qa: '質疑3' },
    { category: 'その他', text: 'コーヒー原価は1杯20円程度', qa: '質疑1' },
  ],
  notes: [
    {
      label: 'KPIと撤退基準',
      text: '施策前と比べた売上の増加率、朝の時間帯の売上増加率、客単価。既存の利益を損なっていれば撤退する〔質疑1〕。レジに余裕がある（例：2台で稼働率100%と50%）場合ほど、実現性とインパクトが高い〔質疑2〕。',
    },
  ],
  ghost: {
    premises: [
      ['対象', '1店舗'],
      ['立地', '都市部の住宅街とオフィスが混在するエリア'],
      ['客層', '通勤客と住民'],
      ['時間軸', '3年'],
      ['ゴール', '売上20%増（1.2倍）'],
    ],
    scale: 'single',
    target: { multiplier: 1.2, years: 3 },
    current: ['客数はコンビニという業態上、差別化が難しく伸ばしにくいので、単価を狙う'],
    sheets: [
      { key: 'main', name: '客数×単価×頻度', tree: main },
      { key: 'seg', name: '客層×時間帯', tree: seg(false) },
    ],
    focus: '朝の通勤客。客数は最も多いのに、朝食だけ、コーヒー1杯だけで単価が低い',
    pins: [
      { sheet: 'seg', label: '通勤客/朝' },
      { sheet: 'main', label: '単価' },
    ],
    measures: [
      {
        name: 'コーヒーLサイズ無料',
        reason: 'まとめ買いで単価を上げ、差別化にもなる',
        body: '朝に1,000円以上買うとコーヒーLサイズ無料（まとめ買いで単価を上げ、差別化にもなる）',
        node: { sheet: 'seg', label: '通勤客/朝' },
      },
    ],
    factCards: [
      { category: '課題', text: '客数は業態上、差別化しにくく伸ばしにくい' },
      { category: '課題', text: '朝の通勤客は客数最多なのに単価が低い' },
    ],
    notes: [],
  },
}
