import type { ScorePacket } from '../logic/report'
import { clamp, letterFromTotal, type ScoreResult } from './types'

/** API が無いときの確定的オフライン採点（同じパケット→同じ点） */
export function scoreOffline(packet: ScorePacket): ScoreResult {
  const sheetBonus = Math.min(10, packet.sheets.length * 4)
  const structure = clamp(8 + sheetBonus + Math.min(7, packet.allMeasures.length))

  const suspects = packet.suspects.length
  const withMotive = packet.suspects.filter((s) => s.motive.trim().length >= 8).length
  const bottleneck = clamp(suspects === 0 ? 4 : 10 + suspects * 4 + withMotive * 2)

  const pitches = packet.pitches
  const filled = (s: string, n = 4) => s.trim().length >= n
  let pitchPts = pitches.length === 0 ? 0 : 4
  for (const p of pitches) {
    pitchPts +=
      (filled(p.premiseDefinition) ? 1 : 0) +
      (filled(p.premiseTarget) ? 1 : 0) +
      (filled(p.current, 8) ? 3 : 0) +
      (filled(p.goal) ? 2 : 0) +
      (filled(p.where) ? 2 : 0) +
      (filled(p.effect, 8) ? 3 : 0)
  }
  const measures = clamp(pitchPts)

  const axes = packet.axes.filter((a) => a.trim()).length
  const rated = packet.allMeasures.filter(
    (m) => Object.keys(m.grades).length >= Math.min(2, axes),
  )
  const high = packet.allMeasures.filter((m) => (m.score ?? 0) >= 4).length
  const evaluation = clamp(
    axes < 2 ? 5 : 8 + Math.min(6, axes * 2) + Math.min(6, rated.length * 2) + Math.min(5, high),
  )

  const total = Math.max(0, Math.min(100, structure + bottleneck + measures + evaluation))

  const gaps: string[] = []
  if (pitches.length === 0) gaps.push('発表する施策タブがない')
  if (pitches.some((p) => !filled(p.current, 8))) gaps.push('現状が薄い')
  if (pitches.some((p) => !filled(p.effect, 8))) gaps.push('効果が薄い')
  if (axes < 2) gaps.push('評価軸が足りない')

  const top = pitches[0]?.measureLabel
  const comment =
    gaps.length === 0
      ? `オフライン採点：施策タブの1分台本（前提／現状／ゴール／効く場所／効果）が揃っている。先頭は「${top ?? '—'}」。`
      : `オフライン採点：改善余地あり（${gaps.join('・')}）。各タブを埋めて再提出すると点が伸びやすい。`

  return {
    source: 'offline',
    total,
    grade: letterFromTotal(total),
    breakdown: { structure, bottleneck, measures, evaluation },
    comment,
  }
}
