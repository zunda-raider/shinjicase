import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getModelStudents } from '../models'
import { DERIVED_MARK, LIBRARY_CASES, renderDerived, sourceBlocks } from './derive'

const root = resolve(__dirname, '../../../data')

describe('data/ ライブラリ（原文＋導出）', () => {
  for (const c of LIBRARY_CASES) {
    const dir = resolve(root, c.dir)
    const source = readFileSync(resolve(dir, 'source.md'), 'utf8')
    for (const st of getModelStudents(c.caseId)) {
      const md = readFileSync(resolve(dir, `answer${st.no}.md`), 'utf8')

      it(`${c.dir} answer${st.no}: 原文は source.md の文そのまま`, () => {
        const blocks = sourceBlocks(md)
        expect(blocks.map((b) => b.kind)).toEqual(['ghost', 'god'])
        const srcLines = new Set(source.split('\n'))
        for (const b of blocks) {
          expect(b.text.trim().length).toBeGreaterThan(20)
          // 完全解・パターン節は連続した抜き出し。まるやまの許容解は到達度表の見出し＋その生徒の行（各行が原文の行）
          if (b.kind === 'god' || c.layout === 'conbini') expect(source.includes(b.text)).toBe(true)
          else for (const l of b.text.split('\n')) expect(srcLines.has(l)).toBe(true)
        }
        expect(blocks[1].text).toMatch(new RegExp(`^## 完全解${st.no}[：:]`))
      })

      it(`${c.dir} answer${st.no}: 導出は src/data/models と一致（npm run data:derive）`, () => {
        expect(md).toContain(DERIVED_MARK)
        const derived = md.slice(md.indexOf('## 導出（アプリ用）'))
        expect(derived).toBe(renderDerived(st, c.caseId))
      })
    }
  }
})
