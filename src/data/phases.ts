import type { Phase } from '../types'

export const PHASES: { id: Phase; label: string; jp: string; stub?: boolean }[] = [
  { id: 'INTAKE', label: 'INTAKE', jp: 'ⅰ 前提確認（事件受理）', stub: true },
  {
    id: 'EVIDENCE',
    label: 'EVIDENCE（分解と容疑者）',
    jp: 'ⅱ 現状分析 ＋ ⅲ ボトルネック特定（捜査ボード）',
  },
  { id: 'OPERATION', label: 'OPERATION', jp: 'ⅳ 打ち手立案（逮捕作戦）' },
  { id: 'WARRANT', label: 'WARRANT', jp: 'ⅴ 打ち手評価（令状請求）' },
  { id: 'SUMMARY', label: 'SUMMARY', jp: 'ⅵ 要点整理（施策タブ）' },
  { id: 'REPORT', label: 'REPORT', jp: 'ⅶ 最終報告（1分台本）' },
]

export const PHASE_TITLES: Record<Phase, string> = {
  INTAKE: '事件受理 — INTAKE',
  EVIDENCE: '捜査ボード — EVIDENCE',
  OPERATION: '逮捕作戦 — OPERATION',
  WARRANT: '令状請求 — WARRANT',
  SUMMARY: '要点整理 — SUMMARY',
  REPORT: '最終報告 — REPORT',
}
