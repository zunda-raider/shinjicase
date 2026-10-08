import type { Phase } from '../types'

export const PHASES: { id: Phase; label: string; jp: string; stub?: boolean }[] = [
  { id: 'INTAKE', label: 'INTAKE', jp: 'ⅰ 前提確認（事件受理）', stub: true },
  { id: 'EVIDENCE', label: 'EVIDENCE', jp: 'ⅱ 現状分析（捜査ボード）' },
  { id: 'PRIME_SUSPECT', label: 'PRIME SUSPECT', jp: 'ⅲ ボトルネック特定（容疑者特定）' },
  { id: 'OPERATION', label: 'OPERATION', jp: 'ⅳ 打ち手立案（逮捕作戦）', stub: true },
  { id: 'WARRANT', label: 'WARRANT', jp: 'ⅴ 打ち手評価（令状請求）', stub: true },
]
