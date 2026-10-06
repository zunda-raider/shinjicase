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
  | 'BRIEFING'
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
