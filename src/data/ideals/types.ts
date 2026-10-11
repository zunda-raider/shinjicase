/** 模範解答から作る採点用の許容条件（hot_spots） */
export interface StrategyLineage {
  id: string
  /** 系統名 */
  name: string
  /** 主軸 */
  axes: string[]
  /** 理由として言えていればよいこと */
  reason: string
  /** 判定用キーワード */
  keywords: string[]
}

export interface RequiredElement {
  id: 'premise' | 'decomposition' | 'focusReason' | 'measures' | 'conclusionFirst'
  name: string
  passLine: string
}

export interface IdealAnswer {
  caseId: string
  odai: string
  requiredElements: RequiredElement[]
  acceptedFirstDecompositions: string[]
  /** 第1分解の判定パターン（ルート直下の子の名前で照合。groups の各要素は同義語） */
  decompositionPatterns?: { name: string; op: 'mul' | 'add'; groups: string[][]; need?: number }[]
  /** 分解で「動かせない要素」を明言しているかの判定語（必須要素にある事件のみ） */
  fixedFactorKeywords?: string[]
  hotSpots: StrategyLineage[]
  /** 質疑の突っ込みパターン（CAPTAIN の問い・Llama 用） */
  challenges?: { pattern: string; example: string }[]
  /** 不可とするもの */
  rejected: { text: string; keywords: string[] }[]
}
