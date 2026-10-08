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
  | 'PRIME_SUSPECT'
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

export interface EvidenceLink {
  kind: LinkKind
  tag?: MechanismTag
}

export type EvidenceNodeId = string

export interface EvidenceNode {
  id: EvidenceNodeId
  label: string
  /** ボード上の左上座標（px） */
  x: number
  y: number
  /** ルートは null */
  parentId: EvidenceNodeId | null
  /** 親からこのノードへの糸。ルートは undefined */
  link?: EvidenceLink
}

export interface EvidenceTree {
  rootId: EvidenceNodeId
  nodes: Record<EvidenceNodeId, EvidenceNode>
  /** 採番用カウンタ */
  seq: number
}
