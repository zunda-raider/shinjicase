/*
 * data/<category>/<slug>/answerN.md の生成。
 * ## 原文（ソース）… source.md から生徒Nの節をそのまま抜き出す（無ければ既存ファイルの原文を保持）
 * ## 導出（アプリ用）… src/data/models の実行時データから自動生成（手で書かない）
 */
import { getIdeal } from '../ideals'
import { ANALYSIS_LABEL_RE, type ModelNode, type ModelStudent } from '../models/types'
import { buildModelView, type ModelView } from '../../logic/modelView'
import { buildModelReview } from '../../logic/modelReview'
import { nodeKind, numberTree } from '../../logic/evidenceTree'
import { parsePinKey } from '../../logic/workspace'
import { parseMeasureKey } from '../../logic/warrant'

export interface LibraryCase {
  caseId: string
  dir: string // data/ からの相対
  /** 原文の抜き出し方 */
  layout: 'maruyama' | 'conbini'
}

export const LIBRARY_CASES: LibraryCase[] = [
  { caseId: 'local-dept', dir: '02-sales/maruyama-department', layout: 'maruyama' },
  { caseId: 'conbini', dir: '02-sales/convenience', layout: 'conbini' },
]

export const DERIVED_MARK = '<!-- 自動生成: npm run data:derive（src/data/models から）。手で編集しない -->'

/** 見出し行から、同じか上位レベルの次の見出し or 水平線の直前まで */
function sectionFrom(src: string, headingRe: RegExp): string | null {
  const lines = src.split('\n')
  const start = lines.findIndex((l) => headingRe.test(l))
  if (start < 0) return null
  const level = (lines[start].match(/^#+/) ?? ['##'])[0].length
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    const h = lines[i].match(/^(#+)\s/)
    if ((h && h[1].length <= level) || /^---\s*$/.test(lines[i])) {
      end = i
      break
    }
  }
  return lines.slice(start, end).join('\n').trim()
}

/** 生徒Nの原文。各ブロックは source.md の連続した部分文字列 */
export function extractSource(src: string, layout: LibraryCase['layout'], no: number): { ghost: string; god: string } | null {
  const god = sectionFrom(src, new RegExp(`^## 完全解${no}[：:]`))
  if (!god) return null
  let ghost: string | null
  if (layout === 'conbini') {
    ghost = sectionFrom(src, new RegExp(`^### パターン${no}[：:]`))
  } else {
    // 許容解は事件共通。この生徒の行＝到達度表の見出し＋該当行
    const lines = src.split('\n')
    const h = lines.findIndex((l) => /^\| パターン \| 主軸 \| 到達度/.test(l))
    const row = lines.find((l, i) => i > h && new RegExp(`^\\| ${no} `).test(l))
    ghost = h >= 0 && row ? [lines[h], lines[h + 1], row].join('\n') : null
  }
  return ghost ? { ghost, god } : null
}

const KIND_JA = { split: '分解', extract: '一部抽出', analysis: '分析' } as const

function treeLines(v: ModelView, sheetId: string): string[] {
  const sheet = v.ws.sheets.find((s) => s.id === sheetId)!
  const nums = numberTree(sheet.tree)
  const out: string[] = []
  const walk = (id: string, depth: number) => {
    const n = sheet.tree.nodes[id]
    const op = n.split ? (n.split.kind === 'mul' ? ' ［×］' : ' ［＋］') : ''
    const qa = v.nodeQa[`${sheetId}/${id}`]
    const note = n.note && n.note !== n.label ? `（原文: ${n.note}）` : ''
    const num = nums[id] ? `${nums[id]} ` : ''
    const kind = depth === 0 ? '' : ` — ${KIND_JA[nodeKind(n)]}`
    out.push(`${'  '.repeat(depth)}- ${num}${n.label}${kind}${op}${note}${qa ? ` 〔${qa}〕` : ''}`)
    for (const c of n.children) walk(c, depth + 1)
  }
  walk(sheet.tree.rootId, 0)
  return out
}

function nodePath(v: ModelView, sheetId: string, nodeId: string): string {
  const sheet = v.ws.sheets.find((s) => s.id === sheetId)
  if (!sheet) return nodeId
  const no = numberTree(sheet.tree)[nodeId] ?? ''
  return `${sheet.name} / ${no} ${sheet.tree.nodes[nodeId]?.label ?? ''}`.trim()
}

function modeBlock(st: ModelStudent, mode: 'GHOST' | 'GOD', caseId: string): string {
  const v = buildModelView(st, mode)
  const L: string[] = [`### ${mode === 'GHOST' ? '許容解（GHOST）' : '完全解（GOD）'}`, '']
  L.push('**前提（黄色メモ）**')
  L.push(...(v.premises.length ? v.premises.map((p) => `- ${p.label}：${p.value}`) : ['- （なし）']), '')
  L.push('**現状**')
  L.push(...(v.current.length ? v.current.map((c) => `- ${c}`) : ['- （なし）']), '')
  L.push('**事実カード（EVIDENCE）**')
  L.push(...(v.factCards.length ? v.factCards.map((f) => `- [${f.category}] ${f.text}${f.qa ? ` 〔${f.qa}〕` : ''}`) : ['- （なし）']), '')
  L.push('**構造化（切り口）**')
  for (const s of v.ws.sheets) {
    L.push(`- 切り口「${s.name}」${v.sheetQa[s.id] ? ` 〔${v.sheetQa[s.id]}〕` : ''}`)
    L.push(...treeLines(v, s.id).map((l) => `  ${l}`))
  }
  L.push('')
  L.push('**狙う箱（ピン）**')
  L.push(
    ...(v.pins.length
      ? v.pins.map((k, i) => {
          const p = parsePinKey(k)
          return `- ${i + 1}. ${nodePath(v, p.sheetId, p.nodeId)}`
        })
      : ['- （なし）']),
  )
  L.push(`- 動機（絞り込み）：${v.focus || '（なし）'}`, '')
  L.push('**施策（OPERATION / WARRANT）**')
  L.push('| # | 施策 | 付け先 | 赤番号 | 位置づけ | 理由 |', '|---|---|---|---|---|---|')
  for (const r of v.why) {
    const k = parseMeasureKey(r.key)
    const red = mode === 'GHOST' ? '○' : r.initial ? '○' : ''
    const role = r.role === 'main' ? 'メイン' : '？'
    L.push(`| ${r.number} | ${r.name} | ${nodePath(v, k.sheetId, k.nodeId)} | ${red} | ${role} | ${r.reason || '—'} |`)
  }
  L.push('')
  L.push('**SUMMARY（台本タブ）**')
  if (!v.pitches.length) L.push('- （なし）')
  v.pitches.forEach((p, i) => {
    L.push(`- タブ${i + 1}「${p.role ?? '？'}」${p.title}`)
    for (const [lab, val] of [
      ['前提', p.premise],
      ['現状', p.current],
      ['ゴール', p.goal],
      ['施策', p.where],
      ['効果', p.effect],
    ] as const)
      L.push(`  - ${lab}：${val || '—'}`)
  })
  L.push('')
  const rv = buildModelReview(v.student, mode, getIdeal(caseId))
  L.push('**講評マッピング**')
  if (rv.lineage) L.push(`- 系統：${rv.lineage.name}`)
  if (rv.reach) L.push(`- 到達度：${rv.reach.grade}（${rv.reach.pattern}／足りない点: ${rv.reach.missing}）`)
  for (const p of rv.passMap) L.push(`- ${p.name}：${p.evidence || '—'}`)
  if (mode === 'GOD') L.push(`- 質疑で加わった点：${rv.qaAdded.length}件`)
  return L.join('\n')
}

/** 原文に無い判断（自動検出＋データ側の judgment） */
export function judgmentCalls(st: ModelStudent): string[] {
  const out: string[] = []
  const walk = (n: ModelNode) => {
    for (const c of n.children ?? []) {
      if (c.short && c.short !== c.label) out.push(`ラベル短縮：「${c.label}」→「${c.short}」`)
      const auto = ANALYSIS_LABEL_RE.test(c.label) ? 'analysis' : 'split'
      if (c.kind && c.kind !== auto) out.push(`種類を明示：「${c.short ?? c.label}」= ${KIND_JA[c.kind]}`)
      walk(c)
    }
  }
  const sheets = [...st.sheets, ...(st.ghost?.sheets ?? [])]
  sheets.forEach((s) => walk(s.tree))
  for (const m of [...st.measures, ...(st.ghost?.measures ?? [])]) {
    out.push(`施策の付け先：「${m.name}」→ ${m.node.sheet}/${m.node.label}`)
    if (m.ghostNode) out.push(`GHOST での付け先：「${m.name}」→ ${m.ghostNode.sheet}/${m.ghostNode.label}`)
    if (m.initial !== undefined) out.push(`赤番号（最初の5分）を明示：「${m.name}」= ${m.initial ? 'あり' : 'なし'}`)
  }
  out.push(...(st.judgment ?? []))
  out.push('事実カードは原文の語を短縮して作成（新しい事実は足していない）')
  return [...new Set(out)]
}

export function renderDerived(st: ModelStudent, caseId: string): string {
  return [
    '## 導出（アプリ用）',
    '',
    DERIVED_MARK,
    '',
    modeBlock(st, 'GHOST', caseId),
    '',
    modeBlock(st, 'GOD', caseId),
    '',
    '### 判断したこと（原文に無いもの）',
    '',
    ...judgmentCalls(st).map((j) => `- ${j}`),
    '',
  ].join('\n')
}

export const SRC_OPEN = (k: 'ghost' | 'god') => `<!-- 原文:${k} ここから（source.md のまま・編集しない） -->`
export const SRC_CLOSE = '<!-- 原文 ここまで -->'

export function renderSourcePart(src: { ghost: string; god: string }): string {
  return [
    '## 原文（ソース）',
    '',
    '**許容解（GHOST）**',
    '',
    SRC_OPEN('ghost'),
    src.ghost,
    SRC_CLOSE,
    '',
    '**完全解（GOD）**',
    '',
    SRC_OPEN('god'),
    src.god,
    SRC_CLOSE,
    '',
  ].join('\n')
}

/** 既存ファイルから原文部分を取り出す（source.md に無い新規回答用） */
export function existingSourcePart(md: string): string | null {
  const a = md.indexOf('## 原文（ソース）')
  const b = md.indexOf('\n## 導出（アプリ用）')
  if (a < 0) return null
  return md.slice(a, b < 0 ? undefined : b).trim() + '\n'
}

export function renderAnswer(st: ModelStudent, caseId: string, sourcePart: string): string {
  return [`# 回答${st.no}：${st.title}`, '', sourcePart.trim(), '', renderDerived(st, caseId)].join('\n')
}

/** 原文セクションの各ブロック（マーカーの間） */
export function sourceBlocks(md: string): { kind: 'ghost' | 'god'; text: string }[] {
  const out: { kind: 'ghost' | 'god'; text: string }[] = []
  const re = /<!-- 原文:(ghost|god) ここから[^>]*-->\n([\s\S]*?)\n<!-- 原文 ここまで -->/g
  let m: RegExpExecArray | null
  while ((m = re.exec(md))) out.push({ kind: m[1] as 'ghost' | 'god', text: m[2] })
  return out
}
