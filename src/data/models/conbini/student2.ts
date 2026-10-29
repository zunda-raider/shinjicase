import { leaves, node, type ModelStudent } from '../types'

export const STUDENT2: ModelStudent = {
  no: 2,
  title: '住宅向け商品と、レジの回転率',
  judgment: [
    'GHOST の無人レジの理由はボトルネックの括弧書き（混んでいない店が選ばれる）から取った',
  ],
  premises: [
    ['対象', '1店舗'],
    ['立地', '都市部の混在エリア。動かせない'],
    ['時間軸', '3年'],
    ['現状の数字', '年間売上約2億円、日販約55万円'],
    ['依頼人', '店長'],
  ],
  scale: 'single',
  target: { years: 3 },
  current: [],
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
              node('商圏人数'),
              node('当店の選択率', { op: 'add', splitQa: '質疑5', children: [node('リピート', { kind: 'extract' })] }),
              node('レジの回転率'),
            ],
          }),
          node('客単価', {
            op: 'add',
            splitQa: '質疑2',
            children: [node('住宅客の需要（品揃えがオフィス寄り）', { kind: 'extract', short: '住宅客の需要' })],
          }),
        ],
      }),
    },
  ],
  focus: '最も解くべき課題：客単価。品揃えがオフィス寄りになっていて、住宅街の潜在的な需要を取り込めていない〔質疑2〕',
  pins: [
    { sheet: 'main', label: '客単価' },
    { sheet: 'main', label: '住宅客の需要（品揃えがオフィス寄り）' },
  ],
  measures: [
    {
      name: 'A 家庭向け商品を前面に出す（最優先）',
      role: 'メイン',
      reason: 'コストがほぼかからない〔質疑1〕',
      body: 'グループで扱っている生活用品を入口付近やレジ前に置く。コストがほぼかからない〔質疑1〕',
      node: { sheet: 'main', label: '客単価' },
    },
    {
      name: 'B 両方のニーズを1店で満たす',
      reason: '両方を満たせば差別化になる〔質疑3〕',
      body: 'オフィス寄り・住宅寄りの特化型コンビニが多い中で、両方を満たせば差別化になる。生活用品をクロスセルやセット販売で売る〔質疑3〕',
      node: { sheet: 'main', label: '住宅客の需要（品揃えがオフィス寄り）' },
    },
    {
      name: 'C 店内のゾーニング',
      body: '家庭用品、ビジネス用品、両方に使える食品や水の3つのエリアに分ける〔質疑4〕',
      node: { sheet: 'main', label: '住宅客の需要（品揃えがオフィス寄り）' },
    },
    {
      name: 'D ポイント・クーポン',
      body: '同じ店を繰り返し使うと特典が当たりやすくなる、割引がもらえる仕組みでリピートを作る〔質疑5〕',
      node: { sheet: 'main', label: 'リピート' },
    },
    { name: 'E 無人レジの導入', reason: 'コストと時間がかかるので後回しにする〔質疑1〕', body: 'コストと時間がかかるので後回しにする〔質疑1〕', node: { sheet: 'main', label: 'レジの回転率' } },
  ],
  factCards: [
    { category: '数字', text: '年間売上約2億円／日販約55万円' },
    { category: '課題', text: '品揃えがオフィス寄り、住宅客の需要を逃す', qa: '質疑2' },
  ],
  notes: [],
  ghost: {
    premises: [
      ['対象', '1店舗（多店舗・本部の施策は対象外）'],
      ['立地', '都市部の混在エリアで動かせない'],
      ['時間軸', '3年'],
      ['現状の数字', '年間売上約2億円、日販約55万円'],
      ['依頼人', '店長'],
      ['レジの構成', '自分で置く'],
    ],
    scale: 'single',
    target: { years: 3 },
    current: [],
    sheets: [
      {
        key: 'main',
        name: '客数×客単価',
        tree: node('売上', {
          op: 'mul',
          children: [
            node('客数', { op: 'mul', children: leaves('商圏人数', '当店の選択率', 'レジの回転率') }),
            node('客単価'),
          ],
        }),
      },
    ],
    focus: 'レジの回転率（差別化が難しい中で、混んでいない店が選ばれる）と、住宅客向けの客単価',
    pins: [
      { sheet: 'main', label: 'レジの回転率' },
      { sheet: 'main', label: '客単価' },
    ],
    measures: [
      { name: '無人レジの導入', reason: '差別化が難しい中で、混んでいない店が選ばれる', body: '約1年かかる', node: { sheet: 'main', label: 'レジの回転率' } },
      { name: '日常生活品を前面に', body: '日常生活品を前面に出して単価を上げる', node: { sheet: 'main', label: '客単価' } },
    ],
    factCards: [
      { category: '数字', text: '年間売上約2億円／日販約55万円' },
      { category: '競合', text: '差別化が難しく、混んでいない店が選ばれる' },
    ],
    notes: [],
  },
}
