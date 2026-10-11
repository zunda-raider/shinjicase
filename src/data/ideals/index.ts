import { CONVENIENCE_IDEAL } from './convenience'
import { MARUYAMA_IDEAL } from './maruyama'
import type { IdealAnswer } from './types'

const IDEALS: Record<string, IdealAnswer> = {
  [MARUYAMA_IDEAL.caseId]: MARUYAMA_IDEAL,
  [CONVENIENCE_IDEAL.caseId]: CONVENIENCE_IDEAL,
}

export function getIdeal(caseId: string): IdealAnswer | null {
  return IDEALS[caseId] ?? null
}

export type { IdealAnswer } from './types'
