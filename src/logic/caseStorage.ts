import { DEFAULT_CASE_ID, getCase } from '../data/cases'
import { emptyIntake, parseIntake } from '../data/intake'
import type { IntakeData } from '../types'
import type { EvidenceWorkspace, ReportState, WarrantState } from '../types'
import { createReportState, loadReportState } from './report'
import { isSuspectState, type SuspectState } from './operation'
import { createWarrantState, loadWarrantState } from './warrant'
import { createWorkspace, migrateWorkspace } from './workspace'

const ACTIVE_KEY = 'shinjicase.activeCase'
const LEGACY = {
  evidence: 'shinjicase.evidence.v4',
  evidenceV3: 'shinjicase.evidence.v3',
  evidenceV2: 'shinjicase.evidence.v2',
  suspects: 'shinjicase.suspects.v1',
  warrant: 'shinjicase.warrant.v1',
  report: 'shinjicase.report.v1',
  legacyV1: 'shinjicase.evidence.v1',
} as const

export function caseStorageKey(
  caseId: string,
  kind: 'evidence' | 'suspects' | 'warrant' | 'report' | 'intake',
) {
  const map = {
    intake: 'intake.v1',
    evidence: 'evidence.v4',
    suspects: 'suspects.v1',
    warrant: 'warrant.v1',
    report: 'report.v1',
  } as const
  return `shinjicase.case.${caseId}.${map[kind]}`
}

export function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function loadActiveCaseId(): string {
  try {
    const id = localStorage.getItem(ACTIVE_KEY)
    if (id && getCase(id).id === id) return id
  } catch {
    // ignore
  }
  return DEFAULT_CASE_ID
}

export function saveActiveCaseId(caseId: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, caseId)
  } catch {
    // ignore
  }
}

/** 旧グローバルキーをデフォルト事件の名前空間へ一度だけ移す */
export function migrateLegacyInto(caseId: string) {
  const pairs: [string, string][] = [
    [LEGACY.evidence, caseStorageKey(caseId, 'evidence')],
    [LEGACY.suspects, caseStorageKey(caseId, 'suspects')],
    [LEGACY.warrant, caseStorageKey(caseId, 'warrant')],
    [LEGACY.report, caseStorageKey(caseId, 'report')],
  ]
  for (const [from, to] of pairs) {
    if (!readJson(to) && readJson(from)) writeJson(to, readJson(from))
  }
  try {
    Object.values(LEGACY).forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

export function loadCaseWorkspace(caseId: string, metric: string): EvidenceWorkspace {
  migrateLegacyInto(DEFAULT_CASE_ID)
  try {
    const ws = migrateWorkspace(
      {
        v4: readJson(caseStorageKey(caseId, 'evidence')),
        v3: null,
        v2: null,
      },
      metric,
    )
    if (ws) return ws
  } catch {
    // ignore
  }
  return createWorkspace(metric)
}

export function loadCaseSuspects(caseId: string): SuspectState {
  const v = readJson(caseStorageKey(caseId, 'suspects'))
  return isSuspectState(v) ? v : { pins: [], motives: {} }
}

export function loadCaseWarrant(caseId: string): WarrantState {
  return loadWarrantState(readJson(caseStorageKey(caseId, 'warrant')))
}

export function loadCaseReport(caseId: string): ReportState {
  return loadReportState(readJson(caseStorageKey(caseId, 'report')))
}

export function freshCaseBundle(metric: string) {
  return {
    workspace: createWorkspace(metric),
    pins: [] as string[],
    motives: {} as Record<string, string>,
    warrant: createWarrantState(),
    report: createReportState(),
  }
}

/** プレイヤーが設定した前提。未設定なら空（調書は事件から） */
export function loadCaseIntake(caseId: string): IntakeData {
  const statement = getCase(caseId).intake.statement
  return parseIntake(readJson(caseStorageKey(caseId, 'intake')), statement) ?? emptyIntake(statement)
}
