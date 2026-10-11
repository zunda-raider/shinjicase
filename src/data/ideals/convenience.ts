import type { IdealAnswer } from './types'

/** コンビニ。出典: src/data/archive/convenience-store.md の許容解（GHOST）と突っ込みパターン */
export const CONVENIENCE_IDEAL: IdealAnswer = {
  caseId: 'conbini',
  odai: 'コンビニの売上向上施策',
  requiredElements: [
    { id: 'premise', name: '前提', passLine: '1店舗かどうか、立地、客層、期間のうち2つ以上を確認するか、自分で置く' },
    { id: 'decomposition', name: '分解', passLine: '売上を下の表のいずれかで分解し、動かせない要素を明言する' },
    { id: 'focusReason', name: '絞り込み', passLine: '立地と客層から、狙う箱を1つに絞る理由を言う' },
    { id: 'measures', name: '施策', passLine: '狙った箱にひも付いた具体策がある' },
    { id: 'conclusionFirst', name: '話し方', passLine: '結論から話す' },
  ],
  acceptedFirstDecompositions: [
    '客数×客単価（×頻度）',
    '商圏人数×選択率×レジの回転率×客単価',
    '通過人数×来店割合×客単価（駅前と置いた場合）',
    '来店客数×購入率×客単価（購入率は動かさない）',
    '近隣住民数×食事の回数×選択率×客単価',
  ],
  decompositionPatterns: [
    { name: '客数×客単価（×頻度）', op: 'mul', groups: [['客数'], ['単価']] },
    { name: '商圏人数×選択率×回転率×客単価', op: 'mul', groups: [['商圏'], ['選択率'], ['回転率'], ['単価']], need: 3 },
    { name: '通過人数×来店割合×客単価', op: 'mul', groups: [['通過'], ['来店割合'], ['単価']] },
    { name: '来店客数×購入率×客単価', op: 'mul', groups: [['来店客数', '客数'], ['購入率'], ['単価']] },
    { name: '近隣住民数×食事の回数×選択率×客単価', op: 'mul', groups: [['住民数'], ['食事'], ['選択率'], ['単価']], need: 3 },
  ],
  fixedFactorKeywords: ['動かせない', '動かさない', '伸ばしにくい', '対象外', 'もともと高い', '伸びしろが小さい'],
  hotSpots: [
    { id: 'morning', name: '朝の通勤客の客単価', axes: ['朝', '通勤客', '客単価'], reason: '客数が多いのに単価が低い', keywords: ['朝', '通勤', '朝食', 'コーヒー', 'セット'] },
    { id: 'resident', name: '住宅客の需要の取りこぼし', axes: ['住民', '住宅客'], reason: '混在エリアなのに品揃えがオフィス寄り', keywords: ['住宅', '住民', '日用品', '生活用品', '家庭'] },
    { id: 'visit-rate', name: '来店割合', axes: ['来店割合'], reason: '駅前で通過人数が大きい', keywords: ['来店割合', '通過', '必需品', '駅前'] },
    { id: 'evening', name: '夕方の住民の買上点数', axes: ['夕方', '買上点数'], reason: '帰宅途中にまとめて買いたい', keywords: ['夕方', '夕飯', '買上点数', '点数', '帰宅'] },
    { id: 'competitor', name: '競合から取り込める選択率', axes: ['選択率'], reason: '既存客の需要はすでに取り切っている', keywords: ['選択率', 'スーパー', 'ドラッグストア', '自炊', '健康食'] },
    { id: 'register', name: 'レジの回転率', axes: ['レジ', '回転率'], reason: '2番手として。単独で最重要なら待ち時間による取りこぼしの根拠が必要', keywords: ['レジ', '回転率', '無人レジ', 'セルフレジ'] },
  ],
  rejected: [
    { text: '商圏人数や通過人数を増やすことを主軸にする', keywords: ['商圏人数を増やす', '通過人数を増やす'] },
    { text: '多店舗展開や本部の施策（対象外）', keywords: ['多店舗展開', '本部の施策として'] },
    { text: '狙う箱にひも付かない施策', keywords: [] },
  ],
  challenges: [
    { pattern: '実現性・制約', example: '朝のピークにセット特典を回せるか' },
    { pattern: '課題を1つに絞る', example: '最も解くべき課題は何か' },
    { pattern: '二択・優先順位', example: '点数と頻度のどちらか、どの施策から始めるか' },
    { pattern: '前提への反証', example: '客層が固定なら頻度も伸びないのか、最も不確かな前提は' },
    { pattern: '純増かどうか', example: 'セットへの置き換えにすぎないのでは' },
    { pattern: 'リスク', example: '個人情報、推定の誤り' },
    { pattern: '効果の測り方', example: '表示しなくても買っていた分をどう切り分けるか' },
    { pattern: '売場面積のトレードオフ', example: '棚を削ると既存売上が落ちないか' },
    { pattern: '価格差を超える理由', example: 'スーパーより割高でも選ばれるか' },
    { pattern: '別の方向性', example: '既存の打ち手が使えないなら何をするか' },
  ],
}
