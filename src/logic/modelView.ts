import { DEFAULT_METRIC } from '../data/intake'
import type { FactCard } from '../data/models/factCards'
import { classifyModelNode } from '../data/models/types'
import type { ModelMode, ModelNode, ModelRef, ModelStudent } from '../data/models/types'
import type { EvidenceTree, EvidenceWorkspace, IntakeData } from '../types'
import { createTree, decompose, numberTree, setNodeKind } from './evidenceTree'
import { measureKey } from './warrant'
import { addMeasure, newSheet, pinKey } from './workspace'
import { MAX_PINS } from './evidenceTree'

/*
 * 模範解答（生徒n）→ アプリの各フェーズで読み取り専用に表示するための形。
 * プレイヤーの state / localStorage とは完全に別物（ここでは何も保存しない）。
 */

/** 前提ではなく現状（事実）として扱うラベル */
export const FACT_LABEL_RE = /^(現状|売上$|売上構成|売上推移|収支|実績|数字)|現状の数字|構成比/
export function isFactLabel(label: string): boolean {
  return FACT_LABEL_RE.test(label.trim())
}

const QA_RE = /〔質疑[^〕]*〕/

/** 原文 → モード別の表示文。GHOST は〔質疑n〕を含む文を除く。 */
export function modeText(src: string, mode: ModelMode): string {
  const s = src.replace(/\*\*/g, '')
  if (mode === 'GOD') return s
  const parts = s.match(/[^。]+。?/g) ?? []
  return parts
    .filter((p) => !QA_RE.test(p))
    .join('')
    .trim()
}

export interface ModelPitch {
  title: string
  /** メイン/サブ：原文（GHOST 部分）が明示している場合のみ。まるやまの6人はいずれも明示なし */
  role?: string
  premise: string
  current: string
  goal: string
  where: string
  effect: string
}

export interface ModelView {
  student: ModelStudent
  mode: ModelMode
  intake: IntakeData
  premises: { label: string; value: string }[]
  ws: EvidenceWorkspace
  pins: string[]
  /** シートID → 質疑ラベル（GOD のみ） */
  sheetQa: Record<string, string>
  /** "シートID/ノードID" → 質疑ラベル（GOD のみ） */
  nodeQa: Record<string, string>
  /** measureKey → 見込み */
  estimates: Record<string, string>
  current: string[]
  /** 事実（売上構成・数字など） */
  facts: string[]
  /** EVIDENCE ボードの事実・現状カード */
  factCards: FactCard[]
  focus: string
  notes: { label: string; text: string }[]
  pitches: ModelPitch[]
  /** 原文に評点があるときだけ */
  warrant?: { axes: string[]; ratings: Record<string, string[]> }
}

function buildTree(
  root: ModelNode,
  mode: ModelMode,
  qaOut: Record<string, string>,
): EvidenceTree {
  let t = createTree(DEFAULT_METRIC)
  const walk = (src: ModelNode, id: string) => {
    let kids = src.children ?? []
    if (mode === 'GHOST') kids = src.splitQa ? [] : kids.filter((k) => !k.qa)
    if (kids.length === 0) return
    const r = decompose(t, id, src.op ?? 'add', kids.map((k) => k.label))
    t = r.tree
    kids.forEach((k, i) => {
      t = setNodeKind(t, r.ids[i], classifyModelNode(k))
      const q = k.qa ?? src.splitQa
      if (mode === 'GOD' && q) qaOut[r.ids[i]] = q
      walk(k, r.ids[i])
    })
  }
  walk(root, t.rootId)
  return t
}

/** pitch の効果に入れない注記（評価・順番系） */
const NOT_EFFECT_RE = /順番|優先順位|最も不確かな前提/

export function buildModelView(base: ModelStudent, mode: ModelMode): ModelView {
  const student: ModelStudent = mode === 'GHOST' && base.ghost ? { ...base, ...base.ghost, warrant: undefined } : base
  const sheetIds: Record<string, string> = {}
  const sheetQa: Record<string, string> = {}
  const nodeQa: Record<string, string> = {}
  const sheets = student.sheets
    .filter((s) => mode === 'GOD' || !s.qa)
    .map((s, i) => {
      const id = `s${i + 1}`
      sheetIds[s.key] = id
      if (mode === 'GOD' && s.qa) sheetQa[id] = s.qa
      const q: Record<string, string> = {}
      const tree = buildTree(s.tree, mode, q)
      for (const [nid, label] of Object.entries(q)) nodeQa[pinKey(id, nid)] = label
      return newSheet(id, s.name, tree)
    })
  let ws: EvidenceWorkspace = { version: 4, seq: sheets.length, activeSheetId: 's1', sheets }

  const resolve = (ref: ModelRef | undefined) => {
    if (!ref) return null
    const sid = sheetIds[ref.sheet]
    const sheet = ws.sheets.find((s) => s.id === sid)
    const node = sheet && Object.values(sheet.tree.nodes).find((n) => n.label === ref.label && n.parentId)
    return sheet && node ? { sheetId: sheet.id, nodeId: node.id } : null
  }

  const pins: string[] = []
  for (const p of student.pins) {
    const r = resolve(p)
    if (!r || pins.length >= MAX_PINS) continue
    const k = pinKey(r.sheetId, r.nodeId)
    if (!pins.includes(k)) pins.push(k)
  }

  const all = student.premises
    .map(([label, value]) => ({ label, value: modeText(value, mode) }))
    .filter((p) => p.value)
  // 前提条件だけをメモに。数字・構成・収支などの事実は現状へ
  const premises = all.filter((p) => !isFactLabel(p.label))
  const facts = all.filter((p) => isFactLabel(p.label)).map((p) => `${p.label}：${p.value}`)
  const current = [...facts, ...student.current.map((c) => modeText(c, mode)).filter(Boolean)]
  const notes = student.notes
    .map((n) => ({ label: n.label, text: modeText(n.text, mode) }))
    .filter((n) => n.text)

  const estimates: Record<string, string> = {}
  let pitches: ModelPitch[] = []
  const premiseLine = premises.map((p) => `${p.label}：${p.value}`).join('／')
  const goal = premises.find((p) => p.label === 'ゴール')?.value ?? ''
  for (const m of student.measures) {
    const r = resolve(m.node) ?? resolve(m.ghostNode)
    if (!r) continue
    const body = modeText(m.body, mode)
    const text = body ? `${m.name}：${body}` : m.name
    const added = addMeasure(ws, r.sheetId, r.nodeId, text)
    ws = added.ws
    const key = measureKey(r.sheetId, r.nodeId, added.id)
    if (m.estimate) estimates[key] = m.estimate
    {
      const sheet = ws.sheets.find((s) => s.id === r.sheetId)!
      const no = numberTree(sheet.tree)[r.nodeId]
      pitches.push({
        title: m.name.replace(/^[A-Z]\s+/, '').replace(/（最優先）$/, ''),
        ...(m.role ? { role: m.role } : {}),
        premise: premiseLine,
        current: current.join('／'),
        goal,
        where: `${no} ${sheet.tree.nodes[r.nodeId].label}${body ? `：${body}` : ''}`,
        effect: [
          ...notes.filter((n) => !NOT_EFFECT_RE.test(n.label)).map((n) => `${n.label}：${n.text}`),
        ]
          .filter(Boolean)
          .join('／'),
      })
    }
  }

  pitches = [...pitches.filter((p) => p.role), ...pitches.filter((p) => !p.role)].slice(0, 2)

  const definition = premises.find((p) => p.label === '売上の定義')?.value ?? ''
  const intake: IntakeData = {
    status: 'player',
    definition: { term: DEFAULT_METRIC, meaning: definition },
    client: { name: '', role: '' },
    target: {
      metric: DEFAULT_METRIC,
      multiplier: student.target?.multiplier ?? 1,
      years: student.target?.years ?? 0,
    },
    area: '',
    scale: student.scale ?? null,
    storeCount: null,
    extras: premises
      .filter((p) => p.label !== '売上の定義')
      .map((p, i) => ({ id: `m${i}`, label: p.label, value: p.value })),
  }

  return {
    student: base,
    mode,
    ...(student.warrant ? { warrant: student.warrant } : {}),
    intake,
    premises,
    ws,
    pins,
    sheetQa,
    nodeQa,
    estimates,
    current,
    facts,
    factCards: student.factCards.filter((c) => mode === 'GOD' || !c.qa),
    focus: modeText(student.focus, mode),
    notes,
    pitches,
  }
}

/** OPERATION の既定の切り口：施策が最も多いシート（同数は先頭）。施策がなければ先頭 */
export function defaultOperationSheet(ws: EvidenceWorkspace): string {
  let best = ws.sheets[0]?.id ?? 's1'
  let max = 0
  for (const s of ws.sheets) {
    const n = Object.values(s.measures).reduce((a, l) => a + l.filter((m) => m.text.trim()).length, 0)
    if (n > max) {
      max = n
      best = s.id
    }
  }
  return best
}
