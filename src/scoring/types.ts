import type { ScorePacket } from '../logic/report'

export type ScoreLetter = 'S' | 'A' | 'B' | 'C' | 'D'
export type Reach = '◎' | '○' | '△'

export type CriterionId = 'premise' | 'decomposition' | 'focus' | 'measures' | 'speech' | 'evaluation'

export interface CriterionScore {
  id: CriterionId
  name: string
  score: number
  max: number
  feedback: string
}

export interface ScoreResult {
  source: 'llama' | 'rule'
  model?: string
  total: number
  grade: ScoreLetter
  criteria: CriterionScore[]
  comment: string
  reach: Reach
  closest?: { caseId: string; no: number; title: string; missing: string }
}

export type { ScorePacket }

export function letterFromTotal(total: number): ScoreLetter {
  if (total >= 90) return 'S'
  if (total >= 80) return 'A'
  if (total >= 65) return 'B'
  if (total >= 50) return 'C'
  return 'D'
}

export function reachFromTotal(total: number): Reach {
  if (total >= 85) return '◎'
  if (total >= 70) return '○'
  return '△'
}

export function clamp(n: number, lo = 0, hi = 25): number {
  return Math.max(lo, Math.min(hi, Math.round(n)))
}
