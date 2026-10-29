import { leaves, node, type ModelStudent } from '../types'

const premises: [string, string][] = [
  ['対象', '大手チェーンに加盟する1店舗'],
  ['立地', '都市部混在エリア'],
  ['時間軸', '3年'],
]

export const STUDENT5: ModelStudent = {
  no: 5,
  title: '夕方の住民の買上点数',
  judgment: [
    '施策Aの理由は「絞り込み」の文（短期の売上に反映しやすい…）から取った',
  ],
  premises,
  scale: 'single',
  target: { years: 3 },
  current: ['購入率：もともと高い', 'コンビニの強み：帰宅途中に、翌朝の分まで短時間でまとめて買えること〔質疑3〕'],
  sheets: [
    {
      key: 'main',
      name: '来店客数×購入率×客単価',
      tree: node('売上', {
        op: 'mul',
        children: [
          node('来店客数', { op: 'mul', children: leaves('既存顧客', '来店頻度') }),
          node('購入率'),
          node('客単価', {
            op: 'mul',
            children: [
              node('買上点数', { op: 'add', splitQa: '質疑2', children: leaves('いつもの点数', '増分（翌朝用・デザート）') }),
              node('単価'),
            ],
          }),
        ],
      }),
    },
  ],
  focus:
    '主に狙う効果：買上点数。夕方にすでに来ている客なので、短期の売上に反映しやすい。来店頻度は習慣づけに時間がかかるので後に回す〔質疑1〕',
  pins: [
    { sheet: 'main', label: '買上点数' },
    { sheet: 'main', label: '増分（翌朝用・デザート）' },
  ],
  measures: [
    { name: 'A 夕飯セットの事前予約', reason: '夕方にすでに来ている客なので、短期の売上に反映しやすい。来店頻度は習慣づけに時間がかかるので後に回す〔質疑1〕', body: 'アプリで提案し、帰宅時に受け取れるようにする', node: { sheet: 'main', label: '買上点数' } },
    {
      name: 'B 純粋な追加購入を作る',
      body: '主商品は値引きしない。普段の点数を超えたときだけ特典をつける。弁当だけの客には翌朝用のパン、コーヒー、デザートを提案する〔質疑2〕',
      node: { sheet: 'main', label: '増分（翌朝用・デザート）' },
      ghostNode: { sheet: 'main', label: '買上点数' },
    },
    {
      name: 'C 行動にもとづく提案',
      body: '属性は推定せず、購買行動だけで提案する。提案理由を過去の購入との組み合わせとして見せ、オプトアウトもできるようにする〔質疑3・4〕',
      node: { sheet: 'main', label: '増分（翌朝用・デザート）' },
    },
    {
      name: 'D 反応しない客には止める',
      body: 'クリック率、追加購入率、客単価の増分を見て、反応がなければ表示を減らすか止める〔質疑5〕',
      node: { sheet: 'main', label: '増分（翌朝用・デザート）' },
    },
    { name: 'E 段階的な展開', body: '夕方で検証し、朝・昼に広げる', node: { sheet: 'main', label: '買上点数' } },
  ],
  factCards: [
    { category: '顧客', text: '購入率はもともと高い' },
    { category: '強み弱み', text: '帰宅途中に翌朝分までまとめ買いできる', qa: '質疑3' },
    { category: '課題', text: '来店頻度は習慣づけに時間がかかる', qa: '質疑1' },
  ],
  notes: [
    {
      label: '効果の測り方',
      text: 'KPIは顧客ごとの増分点数と増分売上〔質疑2〕。似た客をランダムに2群に分け、表示した群と表示しない群の差で純粋な効果を測る（例：1,050円と1,000円なら50円）。数週間〜数か月で比較し、前倒し購入や他商品の減少も確認する。最終指標は増分粗利〔質疑6〕。',
    },
  ],
  ghost: {
    premises,
    scale: 'single',
    target: { years: 3 },
    current: ['購入率はもともと高いので動かさない'],
    sheets: [
      {
        key: 'main',
        name: '来店客数×購入率×客単価',
        tree: node('売上', { op: 'mul', children: leaves('1日の来店客数', '購入率', '客単価') }),
      },
      {
        key: 'time',
        name: '時間帯別',
        tree: node('売上', { op: 'add', children: leaves('朝・昼（オフィスワーカー・単品）', '夕方以降（住民・ニーズがさまざま）') }),
      },
    ],
    focus: '夕方以降の住民の来店頻度と買上点数',
    pins: [
      { sheet: 'time', label: '夕方以降（住民・ニーズがさまざま）' },
      { sheet: 'main', label: '客単価' },
    ],
    measures: [
      {
        name: '夕飯セットの事前予約',
        body: '弁当、惣菜、冷凍食品、飲料の夕飯セットをアプリで提案し、事前予約・帰宅時受け取りにする',
        node: { sheet: 'time', label: '夕方以降（住民・ニーズがさまざま）' },
      },
      { name: '段階的な展開', body: '夕方で検証してから朝・昼に広げる', node: { sheet: 'time', label: '夕方以降（住民・ニーズがさまざま）' } },
    ],
    factCards: [
      { category: '顧客', text: '購入率はもともと高い（動かさない）' },
      { category: '顧客', text: '朝・昼はオフィスワーカーで単品' },
      { category: '顧客', text: '夕方以降は住民でニーズがさまざま' },
    ],
    notes: [],
  },
}
