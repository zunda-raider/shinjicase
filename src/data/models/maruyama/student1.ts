import { leaves, node, type ModelStudent } from '../types'

export const STUDENT1: ModelStudent = {
  no: 1,
  title: '食品・ギフト・外商に集中',
  reach: { pattern: '1 食品・ギフト・外商', axis: '客単価', grade: '◎', missing: '—' },
  premises: [
    ['対象', '1店舗'],
    ['売上の定義', '店頭販売＋外商＋ギフト＋催事'],
    ['ゴール', '3年で売上を100から120に'],
  ],
  scale: 'single',
  target: { multiplier: 1.2, years: 3 },
  current: [
    '人口減少で、来店客数を大きく伸ばすのは難しい',
    '品揃えや価格では、スーパーやECに勝てない',
    '本質的な課題は**体験価値の低下**。「行く理由」「送る理由」「相談する理由」が弱くなっている〔質疑4〕',
    '若年層との接点が弱い',
  ],
  sheets: [
    {
      key: 'main',
      name: '店頭＋外商＋ギフト＋催事',
      tree: node('売上', {
        op: 'add',
        children: [
          node('店頭', { op: 'mul', children: leaves('来店客数', '購入率', '客単価', '来店頻度') }),
          node('外商'),
          node('ギフト'),
          node('催事'),
        ],
      }),
    },
    {
      key: 'use',
      name: '用途別',
      qa: '質疑1・2',
      tree: node('売上', { op: 'add', children: leaves('自家用', 'ギフト', '法人') }),
    },
    {
      key: 'channel',
      name: 'チャネル別',
      qa: '質疑1',
      tree: node('売上', { op: 'add', children: leaves('来店', '来店しない購入（電話注文・配送）') }),
    },
  ],
  focus: 'ギフト・法人という用途への拡大、来店しない購入、来店時の体験価値',
  pins: [
    { sheet: 'use', label: 'ギフト' },
    { sheet: 'use', label: '法人' },
    { sheet: 'channel', label: '来店しない購入（電話注文・配送）' },
    { sheet: 'main', label: 'ギフト' },
  ],
  measures: [
    {
      name: 'A 食品・地域・ギフト',
      body: '地元の商品を、包装、配送、法人対応までまとめて提供する。日常の買い物ではなく、歳暮、中元、香典、帰省土産など単価の高い用途に寄せる〔質疑1〕。食品売場を試食や週替わりの地域フェアで「試せる場所」にし、ギフト売場に用途別の相談カウンターを置く〔質疑5〕',
      estimate: '＋8',
      node: { sheet: 'main', label: 'ギフト' },
    },
    {
      name: 'B 外商',
      body: '高齢富裕層の電話注文と配送〔質疑1〕。地元企業の周年行事、退職祝い、手土産。商工会、金融機関、自治体、病院、学校と連携し、季節ギフトのカタログとまとめ注文の窓口を作る〔質疑2〕。外商顧客向けの試食会を店舗で開く〔質疑5〕',
      estimate: '＋7',
      node: { sheet: 'main', label: '外商' },
    },
    {
      name: 'C 催事',
      body: '物産展、地元食品フェア、季節イベント',
      estimate: '＋5',
      node: { sheet: 'main', label: '催事' },
    },
    {
      name: 'D 若年層（将来への投資）',
      body: '全面転換ではなく補完として、地元カフェ、スイーツ、雑貨、ポップアップ、学生企画で接点を作る。LINEやSNSで催事情報とギフト予約を発信する〔質疑6〕',
      estimate: '—',
      node: { sheet: 'main', label: '来店客数' },
    },
  ],
  notes: [
    {
      label: '伸ばせる根拠',
      text: '値上げではなく、ギフト化、法人化、来店しない購入の拡大で伸ばす。個人の購買余力だけに頼らない〔質疑1〕。',
    },
  ],
}
