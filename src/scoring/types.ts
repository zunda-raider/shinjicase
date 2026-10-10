import type { ScorePacket } from '../logic/report'

export type ScoreLetter = 'S' | 'A' | 'B' | 'C' | 'D'

export interface ScoreBreakdown {
  /** 構造化（ツリー・切り口） 0–25 */
  structure: number
  /** ボトルネック選定 0–25 */
  bottleneck: number
  /** 打ち手の対応 0–25 */
  measures: number
  /** 評価の一貫性 0–25 */
  evaluation: number
}

export interface ScoreResult {
  source: 'llama' | 'offline'
  model?: string
  total: number
  grade: ScoreLetter
  breakdown: ScoreBreakdown
  comment: string
}

export type { ScorePacket }

export function letterFromTotal(total: number): ScoreLetter {
  if (total >= 90) return 'S'
  if (total >= 80) return 'A'
  if (total >= 65) return 'B'
  if (total >= 50) return 'C'
  return 'D'
}

export function clamp(n: number, lo = 0, hi = 25): number {
  return Math.max(lo, Math.min(hi, Math.round(n)))
}
