import type { EvidenceNodeId, EvidenceWorkspace } from '../types'
import { numberTree } from './evidenceTree'
import { filledMeasureCount, isPinValid, parsePinKey } from './workspace'

/** ①②③… */
export function circled(n: number): string {
  return n >= 1 && n <= 20 ? String.fromCharCode(0x2460 + n - 1) : `(${n})`
}

export interface PinMeasureStatus {
  key: string
  /** 全体での容疑者番号（1始まり） */
  pinNo: number
  sheetId: string
  sheetName: string
  nodeId: EvidenceNodeId
  number: string
  title: string
  measureCount: number
}

/** 容疑者ごとの施策数 */
export function pinMeasureStatus(ws: EvidenceWorkspace, pins: string[]): PinMeasureStatus[] {
  return pins
    .filter((k) => isPinValid(ws, k))
    .map((key, i) => {
      const { sheetId, nodeId } = parsePinKey(key)
      const sheet = ws.sheets.find((s) => s.id === sheetId)!
      return {
        key,
        pinNo: i + 1,
        sheetId,
        sheetName: sheet.name,
        nodeId,
        number: numberTree(sheet.tree)[nodeId] ?? '',
        title: sheet.tree.nodes[nodeId].label.trim(),
        measureCount: filledMeasureCount(sheet, nodeId),
      }
    })
}

/** OPERATION での CAPTAIN のセリフ（スクリプト） */
export function operationCaptainLines(ws: EvidenceWorkspace, pins: string[]): string[] {
  const status = pinMeasureStatus(ws, pins)
  if (status.length === 0) {
    return [
      'CAPTAIN「容疑者が決まっていない。EVIDENCE に戻って赤ピンを刺してから来い。」',
      'CAPTAIN「作戦はツリーの箱から出すものだ。思いつきで動くな。」',
    ]
  }
  const missing = status.filter((s) => s.measureCount === 0)
  if (missing.length > 0) {
    return [
      ...missing.map(
        (m) => `CAPTAIN「容疑者${circled(m.pinNo)}『${m.title}』に作戦がない。」`,
      ),
      'CAPTAIN「主犯を野放しにするな。打ち手は必ずツリーの箱に対応させろ。」',
    ]
  }
  const total = ws.sheets.reduce(
    (acc, s) => acc + Object.keys(s.measures).reduce((a, k) => a + filledMeasureCount(s, k), 0),
    0,
  )
  return [
    `CAPTAIN「全容疑者に作戦がある（合計 ${total} 件）。悪くない。」`,
    'CAPTAIN「次は WARRANT だ。効果・実行しやすさ・期間で優先順位をつけて令状を取れ。」',
  ]
}

/** 保存する容疑者データ（赤ピン＋動機） */
export interface SuspectState {
  pins: string[]
  motives: Record<string, string>
}

export function isSuspectState(v: unknown): v is SuspectState {
  if (!v || typeof v !== 'object') return false
  const s = v as Partial<SuspectState>
  return (
    Array.isArray(s.pins) &&
    s.pins.every((p) => typeof p === 'string') &&
    !!s.motives &&
    typeof s.motives === 'object' &&
    Object.values(s.motives).every((m) => typeof m === 'string')
  )
}
