export type CandidateId = string

export interface Candidate {
  id: CandidateId
  title: string
  summary: string
  category: string
}

export interface CaseData {
  id: string
  title: string
  briefing: string
  idealPrimeCount: number
  candidates: Candidate[]
}

export interface PrimeSelection {
  candidateId: CandidateId
  motive: string
}

export type Phase =
  | 'INTAKE'
  | 'EVIDENCE'
  | 'OPERATION'
  | 'WARRANT'

export type CaptainState =
  | 'idle'
  | 'challenging'
  | 'acknowledged'

export interface ChallengeResult {
  lines: string[]
  severity: 'empty' | 'weak' | 'count' | 'ok'
}

/* ------------------------------------------------------------------ */
/* ⅰ INTAKE（事件受理 = 前提確認）                                     */
/* ------------------------------------------------------------------ */

/** 言葉の定義カード。将来は調書のマーカー箇所（range）と紐づける。 */
export interface DefinitionCard {
  term: string
  meaning: string
  /** 将来：調書テキスト内でなぞった位置 */
  range?: { start: number; end: number }
}

/** 依頼人カード（顧客の特定）。将来は options から選ぶ。 */
export interface ClientCard {
  name: string
  role: string
}

/** 目標（Target）。将来は「指標・倍率・期限」のダイヤルで入力する。 */
export interface IntakeTarget {
  metric: string
  multiplier: number
  years: number
}

export interface IntakeData {
  /** 'stub' = 仮置き。将来プレイヤー入力に置き換える。 */
  status: 'stub' | 'player'
  definition: DefinitionCard
  client: ClientCard
  target: IntakeTarget
  /** 将来：依頼人の調書（相談文）。曖昧語をマーカーでなぞる対象。 */
  statement?: string
  /** 将来：依頼人カードの選択肢 */
  clientOptions?: ClientCard[]
}

/* ------------------------------------------------------------------ */
/* ⅱ EVIDENCE（捜査ボード = 現状分析）                                  */
/* ------------------------------------------------------------------ */

/** × = 仕組み（掛け算） / ＋ = 内訳（足し算） */
export type LinkKind = 'mul' | 'add'

/** × のときの任意タグ：増減・生産・転換 */
export type MechanismTag = 'increase' | 'production' | 'conversion'

/** 親ノードの「分け方」。1つの分解につき演算子は1つ。 */
export interface Split {
  kind: LinkKind
  tag?: MechanismTag
}

export type EvidenceNodeId = string

export interface EvidenceNode {
  id: EvidenceNodeId
  label: string
  /** ルートは null */
  parentId: EvidenceNodeId | null
  /** 子（左から右の順） */
  children: EvidenceNodeId[]
  /** 子を持つときの分け方（× or ＋）。子がなければ undefined */
  split?: Split
}

export interface EvidenceTree {
  version: 2
  rootId: EvidenceNodeId
  nodes: Record<EvidenceNodeId, EvidenceNode>
  /** 採番用カウンタ */
  seq: number
}

/** 自動レイアウトの結果 */
export interface TreeLayout {
  width: number
  height: number
  /** カード左上座標 */
  positions: Record<EvidenceNodeId, { x: number; y: number }>
  /** 兄弟の間に置く演算子（親ごと・隙間ごと） */
  operators: { parentId: EvidenceNodeId; index: number; x: number; y: number }[]
}

/* ------------------------------------------------------------------ */
/* 複数の切り口（同じ指標に対する別々の分解ツリー）                    */
/* ------------------------------------------------------------------ */

export type SheetId = string

/** ⅳ 打ち手（施策）。ツリーのノードにぶら下がる。 */
export interface Measure {
  id: string
  text: string
}

/** 1枚のシート = 1つの切り口（例：顧客数×単価）。ルートは全シート共通で ⅰ の指標。 */
export interface EvidenceSheet {
  id: SheetId
  name: string
  tree: EvidenceTree
  /** ノードID → 施策（番号ではなくIDで持つので番号が振り直されても安全） */
  measures: Record<EvidenceNodeId, Measure[]>
  /** 施策ID採番用 */
  measureSeq: number
}

export interface EvidenceWorkspace {
  version: 4
  sheets: EvidenceSheet[]
  activeSheetId: SheetId
  /** シート採番用 */
  seq: number
}
