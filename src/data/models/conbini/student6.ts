import { node, type ModelStudent } from '../types'

const premises: [string, string][] = [
  ['対象', '1店舗'],
  ['立地', '都市部混在エリア'],
  ['時間軸', '3年'],
  ['競合', '他チェーン、スーパー、ドラッグストア、ネット通販'],
]
const KEY = 'スーパー・ドラッグストアから取り込む需要'

export const STUDENT6: ModelStudent = {
  no: 6,
  title: '競合の需要を取り込む',
  premises,
  scale: 'single',
  target: { years: 3 },
  current: ['既存客を狙わない理由：コンビニの需要がある住民はすでに通っていて、頻度も単価も伸びしろが小さい〔質疑1〕'],
  sheets: [
    {
      key: 'main',
      name: '客数×客単価',
      tree: node('売上', {
        op: 'mul',
        children: [
          node('客数', {
            op: 'mul',
            children: [
              node('近隣住民数'),
              node('食事の回数'),
              node('コンビニ選択率', {
                op: 'add',
                children: [
                  node(KEY, {
                    kind: 'extract',
                    short: 'スーパー・ドラッグの需要',
                    op: 'add',
                    children: [
                      node('取り込む相手：単身・共働き世帯', { kind: 'extract', short: '単身・共働き世帯', qa: '質疑5・6' }),
                      node('選ばれる理由：一人分の量・手軽さ', { kind: 'analysis', short: '一人分の量・手軽さ', qa: '質疑4・6' }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          node('客単価'),
        ],
      }),
    },
  ],
  focus: 'スーパー・ドラッグストアから取り込める選択率。既存客はすでに通っていて伸びしろが小さい〔質疑1〕',
  pins: [{ sheet: 'main', label: KEY }],
  measures: [
    {
      name: 'A 健康食・自炊用食材',
      body: '一人が一食で食べきれる量のカット野菜や肉、健康食を置く〔質疑4〕',
      node: { sheet: 'main', label: KEY },
    },
    {
      name: 'B 「行けば何でも揃う」認識を作る',
      body: '自炊用食材、健康食、化粧品を揃え、まずコンビニに行き、足りないものだけ他店で買う行動に変える〔質疑2〕',
      node: { sheet: 'main', label: KEY },
    },
    {
      name: 'C 雑誌売場の置き換え',
      body: 'オンライン化で需要が減った雑誌の棚を縮小し、食材と健康食を置く〔質疑3〕',
      node: { sheet: 'main', label: KEY },
    },
  ],
  factCards: [
    { category: '競合', text: '競合：他チェーン・スーパー・ドラッグ・EC' },
    { category: '顧客', text: '既存客は通い済み、頻度も単価も伸びしろ小', qa: '質疑1' },
    { category: '市場・人口', text: '単身・共働き・夫婦二人世帯が増加', qa: '質疑5' },
  ],
  notes: [
    { label: '規模の根拠', text: '単身、共働き、夫婦二人の世帯が増え、少量の食材の需要は広がっている〔質疑5〕。' },
  ],
  ghost: {
    premises,
    scale: 'single',
    target: { years: 3 },
    current: ['選択率を上げる方向は「コンビニの需要をより満たす」か「スーパー・ドラッグストアの需要をコンビニで満たす」の2つで、後者を選ぶ（インパクトが大きい）'],
    sheets: [
      {
        key: 'main',
        name: '客数×客単価',
        tree: node('売上', {
          op: 'mul',
          children: [
            node('客数', {
              op: 'mul',
              children: [
                node('近隣住民数'),
                node('食事の回数'),
                node('コンビニ選択率', {
                  op: 'add',
                  children: [
                    node('コンビニの需要をより満たす'),
                    node('スーパー・ドラッグストアの需要をコンビニで満たす'),
                  ],
                }),
              ],
            }),
            node('客単価'),
          ],
        }),
      },
    ],
    focus: 'スーパー・ドラッグストアから取り込める選択率（インパクトが大きい）',
    pins: [{ sheet: 'main', label: 'スーパー・ドラッグストアの需要をコンビニで満たす' }],
    measures: [
      {
        name: '健康食・自炊用食材',
        body: '健康食と、カット野菜など一人暮らし向けの自炊用食材を置く',
        node: { sheet: 'main', label: 'スーパー・ドラッグストアの需要をコンビニで満たす' },
      },
    ],
    factCards: [
      { category: '競合', text: '競合：他チェーン・スーパー・ドラッグ・EC' },
      { category: '課題', text: '競合の需要取り込みがインパクト大' },
    ],
    notes: [],
  },
}
