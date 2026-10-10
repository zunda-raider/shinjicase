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
  hotSpots: StrategyLineage[]
  /** 不可とするもの */
  rejected: { text: string; keywords: string[] }[]
}
