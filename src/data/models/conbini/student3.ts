import { leaves, node, type ModelStudent } from '../types'

const premises: [string, string][] = [
  ['対象', '特定の1店舗'],
  ['立地', '都市部の混在エリア'],
  ['客層', '通勤客と住民'],
  ['依頼人', 'FC加盟店'],
]

export const STUDENT3: ModelStudent = {
  no: 3,
  title: '朝の通勤客を最優先に、住民はスモールスタート',
  premises,
  scale: 'single',
  current: [
    '通勤客：朝に集中。昼は会社、夜は自宅や外食で来店が限られる〔質疑6〕',
    '住民：一日を通して需要が見えにくい',
  ],
  sheets: [
    {
      key: 'main',
      name: '客数×客単価',
      tree: node('売上', {
        op: 'mul',
        children: [
          node('客数', { op: 'add', splitQa: '質疑4', children: [node('来店頻度', { kind: 'extract' })] }),
          node('客単価', { op: 'add', splitQa: '質疑3', children: [node('1回あたりの点数', { kind: 'extract' })] }),
        ],
      }),
    },
    {
      key: 'seg',
      name: '客層別',
      tree: node('売上', { op: 'add', children: leaves('通勤客（朝に集中）', '住民（需要が見えにくい）') }),
    },
  ],
  focus: '最も解くべき課題：朝の通勤客の時間の制約と単価の低さ〔質疑1〕',
  pins: [
    { sheet: 'seg', label: '通勤客（朝に集中）' },
    { sheet: 'main', label: '1回あたりの点数' },
  ],
  measures: [
    {
      name: 'A 朝のセット',
      role: 'メイン',
      reason: '既存の商品で始められる〔質疑1〕。通勤客の施策が最優先。2〜3年の時間軸にしても変わらない〔質疑1・2〕',
      body: 'コーヒーと弁当などのセットで、朝ごはんがすぐ揃うようにする。既存の商品で始められる〔質疑1〕。顧客のロイヤリティも高め、来店頻度にも効く〔質疑4〕',
      node: { sheet: 'seg', label: '通勤客（朝に集中）' },
    },
    { name: 'B レジの効率化', body: '朝の時間の制約に応える', node: { sheet: 'seg', label: '通勤客（朝に集中）' } },
    {
      name: 'C 日用品・小容量の拡充',
      reason: '新たな投資が必要なので中長期の施策〔質疑1〕',
      body: '住民の需要に応える。新たな投資が必要なので中長期の施策〔質疑1〕',
      node: { sheet: 'seg', label: '住民（需要が見えにくい）' },
    },
    {
      name: 'D 八百屋的な生鮮ラインナップ',
      reason: '2〜3年の時間軸ならスモールスタートで始める〔質疑2〕',
      body: '2〜3年の時間軸ならスモールスタートで始める〔質疑2〕。スーパーから客を引き込み、来店頻度を上げる〔質疑4〕',
      node: { sheet: 'main', label: '来店頻度' },
      ghostNode: { sheet: 'seg', label: '住民（需要が見えにくい）' },
    },
  ],
  factCards: [
    { category: '顧客', text: '通勤客は朝に集中、昼は会社・夜は自宅', qa: '質疑6' },
    { category: '顧客', text: '住民は一日を通して需要が見えにくい' },
    { category: '課題', text: '朝の通勤客は時間の制約と単価の低さ', qa: '質疑1' },
  ],
  notes: [],
  ghost: {
    premises,
    scale: 'single',
    current: ['通勤客は朝の朝食需要が多い', '住民は朝昼夜にまんべんなく来る'],
    sheets: [
      { key: 'main', name: '客数×客単価', tree: node('売上', { op: 'mul', children: leaves('客数', '客単価') }) },
      {
        key: 'seg',
        name: '客層別',
        tree: node('売上', { op: 'add', children: leaves('通勤客（朝の朝食需要）', '住民（朝昼夜まんべんなく）') }),
      },
    ],
    focus: '朝の通勤客の時間の制約と単価の低さ、住民需要を取り込めていないこと',
    pins: [
      { sheet: 'seg', label: '通勤客（朝の朝食需要）' },
      { sheet: 'seg', label: '住民（朝昼夜まんべんなく）' },
    ],
    measures: [
      {
        name: '朝のコーヒーと弁当などのセット',
        body: '単価を上げる',
        node: { sheet: 'seg', label: '通勤客（朝の朝食需要）' },
      },
      { name: 'レジの効率化', body: '時間の制約に応える', node: { sheet: 'seg', label: '通勤客（朝の朝食需要）' } },
      {
        name: '日用品の拡充と小容量のラインナップ',
        body: '住民の需要を取り込む',
        node: { sheet: 'seg', label: '住民（朝昼夜まんべんなく）' },
      },
    ],
    factCards: [
      { category: '顧客', text: '通勤客は朝の朝食需要が多い' },
      { category: '顧客', text: '住民は朝昼夜にまんべんなく来る' },
      { category: '課題', text: '住民需要を取り込めていない' },
    ],
    notes: [],
  },
}
