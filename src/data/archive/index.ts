/** アプリが読むアーカイブ MD。正本は repo ルート data/02-sales/<slug>/source.md（ローダー未実装のためここにもコピーを置く）。 */
import conbini from './convenience-store.md?raw'
import maruyama from './maruyama-department-store.md?raw'

const ARCHIVES: Record<string, string> = {
  'local-dept': maruyama,
  conbini,
}

export function getArchiveMarkdown(caseId: string): string | null {
  return ARCHIVES[caseId] ?? null
}

export function hasArchive(caseId: string): boolean {
  return caseId in ARCHIVES
}
