import { describe, expect, it } from 'vitest'
import {
  emptyIntake,
  formatTarget,
  multiplierFromPercent,
  otherPremises,
  parseIntake,
  percentFromMultiplier,
  STUB_INTAKE,
} from './intake'
import { buildScorePacket, createPitchCard } from '../logic/report'
import { createWorkspace } from '../logic/workspace'
import { createWarrantState } from '../logic/warrant'
import { createReportState } from '../logic/report'

describe('player intake', () => {
  it('converts percent ↔ multiplier', () => {
    expect(multiplierFromPercent(30)).toBe(1.3)
    expect(percentFromMultiplier(1.25)).toBe(25)
    expect(formatTarget({ metric: '売上', multiplier: 1.3, years: 3 })).toBe('売上 ×1.3（+30%）／3年')
    expect(formatTarget({ metric: '', multiplier: 1, years: 2 })).toBe('売上 ×?／2年')
  })

  it('empty intake is player-owned with blank fields', () => {
    const i = emptyIntake('調書')
    expect(i.status).toBe('player')
    expect(i.definition.meaning).toBe('')
    expect(i.statement).toBe('調書')
  })

  it('migrates old stub data to player and keeps fields', () => {
    const old = {
      status: 'stub',
      definition: { term: '売上', meaning: 'x' },
      client: { name: 'A', role: 'B' },
      target: { metric: '売上', multiplier: 1.2, years: 3 },
    }
    const p = parseIntake(old)!
    expect(p.status).toBe('player')
    expect(p.extras).toEqual([])
    expect(parseIntake({ foo: 1 })).toBeNull()
  })

  it('lists area / scale / extras as other premises and feeds REPORT + packet', () => {
    const i = {
      ...STUB_INTAKE,
      area: '郊外',
      scale: 'chain' as const,
      storeCount: 12,
      extras: [{ id: 'x1', label: '競合', value: '国道沿いに2店' }],
    }
    expect(otherPremises(i)).toEqual([
      { label: '場所', value: '郊外' },
      { label: '規模', value: 'チェーン（12店舗）' },
      { label: '競合', value: '国道沿いに2店' },
    ])
    const card = createPitchCard(
      {
        key: 'k', sheetId: 's1', sheetName: 'S', nodeId: 'n', number: '1', nodeLabel: 'N',
        measureId: 'm', text: 't', pinned: false, pinNo: undefined, score: null, rank: 1, grades: {},
      },
      i,
    )
    expect(card.premiseClient).toContain('規模：チェーン（12店舗）')
    const packet = buildScorePacket({
      intake: i,
      ws: createWorkspace('売上'),
      pins: [],
      motives: {},
      warrant: createWarrantState(),
      report: createReportState(),
    })
    expect(packet.intake.premises).toHaveLength(3)
  })
})

describe('definition text', () => {
  it('shows the definition as-is without a 「売上 ＝」 prefix', async () => {
    const { formatDefinition } = await import('./intake')
    const old = parseIntake({
      status: 'stub',
      definition: { term: '売上', meaning: '給油＋コンビニの合計' },
      client: { name: 'A', role: 'B' },
      target: { metric: '売上', multiplier: 1.2, years: 3 },
    })!
    expect(formatDefinition(old)).toBe('給油＋コンビニの合計')
    expect(formatDefinition(emptyIntake())).toBe('（未定義）')
  })
})
