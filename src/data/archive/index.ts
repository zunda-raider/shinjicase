import maruyama from './maruyama-department-store.md?raw'

const ARCHIVES: Record<string, string> = {
  'local-dept': maruyama,
}

export function getArchiveMarkdown(caseId: string): string | null {
  return ARCHIVES[caseId] ?? null
}

export function hasArchive(caseId: string): boolean {
  return caseId in ARCHIVES
}
