import { DEFAULT_METRIC } from '../data/intake'
import type { ModelMode, ModelNode, ModelRef, ModelStudent } from '../data/models/types'
import type { EvidenceTree, EvidenceWorkspace, IntakeData } from '../types'
import { createTree, decompose, numberTree } from './evidenceTree'
import { measureKey } from './warrant'
import { addMeasure, newSheet, pinKey } from './workspace'
import { MAX_PINS } from './evidenceTree'

/*
 * 模範解答（生徒n）→ アプリの各フェーズで読み取り専用に表示するための形。
 * プレイヤーの state / localStorage とは完全に別物（ここでは何も保存しない）。
 */

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
  focus: string
  notes: { label: string; text: string }[]
  pitches: ModelPitch[]
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
      const q = k.qa ?? src.splitQa
      if (mode === 'GOD' && q) qaOut[r.ids[i]] = q
      walk(k, r.ids[i])
    })
  }
  walk(root, t.rootId)
  return t
}

export function buildModelView(student: ModelStudent, mode: ModelMode): ModelView {
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

  const premises = student.premises
    .map(([label, value]) => ({ label, value: modeText(value, mode) }))
    .filter((p) => p.value)
  const current = student.current.map((c) => modeText(c, mode)).filter(Boolean)
  const notes = student.notes
    .map((n) => ({ label: n.label, text: modeText(n.text, mode) }))
    .filter((n) => n.text)

  const estimates: Record<string, string> = {}
  const pitches: ModelPitch[] = []
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
    if (pitches.length < 2) {
      const sheet = ws.sheets.find((s) => s.id === r.sheetId)!
      const no = numberTree(sheet.tree)[r.nodeId]
      pitches.push({
        title: m.name,
        premise: premiseLine,
        current: current.join('／'),
        goal,
        where: `${no} ${sheet.tree.nodes[r.nodeId].label}（切り口：${sheet.name}）／${text}`,
        effect: [
          m.estimate && m.estimate !== '—' ? `見込み ${m.estimate}` : '',
          ...notes.filter((n) => n.label !== '順番').map((n) => `${n.label}：${n.text}`),
        ]
          .filter(Boolean)
          .join('／'),
      })
    }
  }

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
    student,
    mode,
    intake,
    premises,
    ws,
    pins,
    sheetQa,
    nodeQa,
    estimates,
    current,
    focus: modeText(student.focus, mode),
    notes,
    pitches,
  }
}
