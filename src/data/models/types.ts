import type { BusinessScale, LinkKind } from '../../types'

/**
 * 模範解答（優秀な生徒の回答）の構造化データ。
 * 文中の〔質疑n〕は質疑で加わった部分。GHOST ではその文ごと除く。
 * qa = その要素自体が質疑由来（GOD のみ）。splitQa = その下の分解が質疑由来。
 */
export interface ModelNode {
  label: string
  op?: LinkKind
  children?: ModelNode[]
  qa?: string
  splitQa?: string
}

export interface ModelSheet {
  key: string
  name: string
  qa?: string
  tree: ModelNode
}

export interface ModelRef {
  sheet: string
  label: string
}

export interface ModelMeasure {
  name: string
  /** 中身（原文。〔質疑n〕つき） */
  body: string
  /** 見込み（例 ＋8） */
  estimate?: string
  node: ModelRef
  /** GHOST でそのノードが無いときの付け先 */
  ghostNode?: ModelRef
}

export interface ModelReach {
  pattern: string
  axis: string
  grade: string
  missing: string
}

export interface ModelStudent {
  no: number
  title: string
  reach: ModelReach
  /** 前提（ラベル・原文） */
  premises: [string, string][]
  scale?: BusinessScale
  target?: { multiplier?: number; years?: number }
  current: string[]
  sheets: ModelSheet[]
  focus: string
  pins: ModelRef[]
  measures: ModelMeasure[]
  /** 試算・伸ばせる根拠・順番など */
  notes: { label: string; text: string }[]
}

export type ModelMode = 'GHOST' | 'GOD'

export function node(label: string, extra: Omit<ModelNode, 'label'> = {}): ModelNode {
  return { label, ...extra }
}

export function leaves(...labels: string[]): ModelNode[] {
  return labels.map((l) => node(l))
}
