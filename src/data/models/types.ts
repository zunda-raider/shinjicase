import type { BusinessScale, LinkKind, NodeKind } from '../../types'
import type { FactCard } from './factCards'

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
  /** 明示の種類。省略時は classifyModelNode の一般ルール */
  kind?: NodeKind
  /** カードに出す短いラベル（原文 label はツールチップ） */
  short?: string
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
  /** 最初の5分（GHOST）で使った施策か。省略時は自動判定（matchInitialMeasures） */
  initial?: boolean
  /** GHOST でそのノードが無いときの付け先 */
  ghostNode?: ModelRef
  /** なぜ選んだか（原文が理由を述べているときだけ） */
  reason?: string
  /** 原文が明示している位置づけ（例 メイン＝最優先） */
  role?: string
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
  reach?: ModelReach
  /** 前提（ラベル・原文） */
  premises: [string, string][]
  scale?: BusinessScale
  target?: { multiplier?: number; years?: number }
  current: string[]
  sheets: ModelSheet[]
  focus: string
  pins: ModelRef[]
  measures: ModelMeasure[]
  /** 事実・現状の短いカード（原文の言い回しを縮めたもの） */
  factCards: FactCard[]
  /** 試算・伸ばせる根拠・順番など */
  notes: { label: string; text: string }[]
  /** GHOST を原文で別に持つ事件（パターン節）。あればこちらを GHOST に使う */
  ghost?: ModelGhost
}

export type ModelGhost = Pick<
  ModelStudent,
  'premises' | 'scale' | 'target' | 'current' | 'sheets' | 'focus' | 'pins' | 'measures' | 'factCards' | 'notes'
> & { title?: string }

export type ModelMode = 'GHOST' | 'GOD'

export function node(label: string, extra: Omit<ModelNode, 'label'> = {}): ModelNode {
  return { label, ...extra }
}

export function leaves(...labels: string[]): ModelNode[] {
  return labels.map((l) => node(l))
}

/** 分析・課題（原因・理由・動機・課題・ニーズなど、式の項でないもの）と見なすラベル */
export const ANALYSIS_LABEL_RE = /←|→|要因|原因|動機|理由|課題/

export function classifyModelNode(n: ModelNode): NodeKind {
  return n.kind ?? (ANALYSIS_LABEL_RE.test(n.label) ? 'analysis' : 'split')
}
