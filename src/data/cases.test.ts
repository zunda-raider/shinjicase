import { describe, expect, it } from 'vitest'
import {
  SAMPLE_CASES,
  applySampleSuspects,
  getCase,
  DEFAULT_CASE_ID,
} from './cases'
import { ROOT_ID } from '../logic/evidenceTree'
import { caseStorageKey } from '../logic/caseStorage'

describe('sample cases', () => {
  it('ships 3 playable cases with distinct ids', () => {
    expect(SAMPLE_CASES).toHaveLength(3)
    const ids = SAMPLE_CASES.map((c) => c.id)
    expect(new Set(ids).size).toBe(3)
    expect(DEFAULT_CASE_ID).toBe('blue-oasis')
    expect(getCase('yomiuri-news').label).toBe('東都日報')
    expect(getCase('hinomaru-kitchen').intake.target.multiplier).toBe(1.25)
  })

  it('blue-oasis example has 燃料＋油外 sheet', () => {
    const ws = getCase('blue-oasis').buildExample()
    expect(ws.sheets.map((s) => s.name)).toEqual(
      expect.arrayContaining(['顧客数×単価', '店舗数×店舗あたり売上', '燃料＋油外']),
    )
    const fuel = ws.sheets.find((s) => s.name === '燃料＋油外')!
    const root = fuel.tree.nodes[ROOT_ID]
    expect(root.split?.kind).toBe('add')
    const labels = root.children.map((id) => fuel.tree.nodes[id].label)
    expect(labels).toEqual(['燃料', '油外'])
  })

  it('yomiuri tree reaches 未購読 → 無関心', () => {
    const ws = getCase('yomiuri-news').buildExample()
    const labels = Object.values(ws.sheets[0].tree.nodes).map((n) => n.label)
    expect(labels).toEqual(
      expect.arrayContaining(['購読者数', '他紙購読者', '未購読者', '無関心', '年齢対象外']),
    )
  })

  it('hinomaru tree has 既存離反 and 客単価 = 点数 × 商品単価', () => {
    const ws = getCase('hinomaru-kitchen').buildExample()
    const t = ws.sheets[0].tree
    const labels = Object.values(t.nodes).map((n) => n.label)
    expect(labels).toEqual(
      expect.arrayContaining(['既存離反', '頻度低下', 'リピート低下', '点数', '商品単価']),
    )
  })

  it('applySampleSuspects pins labeled nodes', () => {
    const c = getCase('blue-oasis')
    const ws = c.buildExample()
    const { pins, motives } = applySampleSuspects(c, ws)
    expect(pins.length).toBe(2)
    expect(Object.keys(motives)).toHaveLength(2)
  })

  it('namespaces storage keys per case', () => {
    expect(caseStorageKey('blue-oasis', 'evidence')).toBe(
      'shinjicase.case.blue-oasis.evidence.v4',
    )
    expect(caseStorageKey('yomiuri-news', 'report')).toBe(
      'shinjicase.case.yomiuri-news.report.v1',
    )
  })
})
