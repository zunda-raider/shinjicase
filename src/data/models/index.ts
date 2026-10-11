import { CONBINI_STUDENTS } from './conbini'
import { MARUYAMA_STUDENTS } from './maruyama'
import type { ModelStudent } from './types'

const MODELS: Record<string, ModelStudent[]> = {
  'local-dept': MARUYAMA_STUDENTS,
  conbini: CONBINI_STUDENTS,
}

export function getModelStudents(caseId: string): ModelStudent[] {
  return MODELS[caseId] ?? []
}
