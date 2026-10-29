/** npm run data:derive — data/<category>/<slug>/answerN.md を 原文（source.md から）＋導出（src/data/models から）で書き直す */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getModelStudents } from '../src/data/models'
import {
  LIBRARY_CASES,
  existingSourcePart,
  extractSource,
  renderAnswer,
  renderSourcePart,
} from '../src/data/library/derive'

const root = resolve(import.meta.dirname ?? '.', '..', 'data')
let n = 0
for (const c of LIBRARY_CASES) {
  const dir = resolve(root, c.dir)
  const src = readFileSync(resolve(dir, 'source.md'), 'utf8')
  for (const st of getModelStudents(c.caseId)) {
    const file = resolve(dir, `answer${st.no}.md`)
    const ex = extractSource(src, c.layout, st.no)
    const prev = existsSync(file) ? readFileSync(file, 'utf8') : ''
    const sourcePart = ex ? renderSourcePart(ex) : existingSourcePart(prev)
    if (!sourcePart) throw new Error(`原文が見つからない: ${file}`)
    writeFileSync(file, renderAnswer(st, c.caseId, sourcePart))
    n++
  }
}
console.log(`data:derive wrote ${n} answer files`)
