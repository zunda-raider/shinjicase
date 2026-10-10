import type { IdealAnswer } from '../data/ideals/types'
import { getIdeal } from '../data/ideals'
import { getModelStudents } from '../data/models'
import { buildModelView, type ModelView } from '../logic/modelView'
import { collectMeasures, isFullyRated, namedAxes, rankMeasures } from '../logic/warrant'
import { parsePinKey } from '../logic/workspace'
import type { EvidenceTree, EvidenceWorkspace, IntakeData, ReportState, WarrantState } from '../types'
import {
  clamp,
  letterFromTotal,
  reachFromTotal,
  type CriterionId,
  type CriterionScore,
  type ScoreResult,
} from './types'

/*
 * ルールベース採点（API なしで動く主採点）。
 * 配点は許容解の必須要素に合わせる：前提15・分解20・絞り込み20・施策25・話し方15・評価5。
 * 評価（WARRANT）は許容解の必須要素ではないので軽め。
 */

export const MAX: Record<CriterionId, number> = {
  premise: 15,
  decomposition: 20,
  focus: 20,
  measures: 25,
  speech: 15,
  evaluation: 5,
}
export const NAME: Record<CriterionId, string> = {
  premise: '前提',
  decomposition: '分解（構造化）',
  focus: '絞り込みの理由',
  measures: '施策',
  speech: '話し方（結論から）',
  evaluation: '評価',
}

export interface ScoreInput {
  caseId: string
  premises: { label: string; value: string }[]
  /** 目標が数値で置かれているか（倍率など） */
  numericTarget: boolean
  years: number
  ws: EvidenceWorkspace
  pins: string[]
  motives: Record<string, string>
  warrant: WarrantState | null
  pitches: { measureKey?: string; premise: string; current: string; goal: string; where: string; effect: string }[]
  finalAnswer: string
}

/* ---------------- 入力の組み立て ---------------- */

export function scoreInputFromPlayer(a: {
  caseId: string
  intake: IntakeData
  ws: EvidenceWorkspace
  pins: string[]
  motives: Record<string, string>
  warrant: WarrantState
  report: ReportState
}): ScoreInput {
  const { intake } = a
  const premises: { label: string; value: string }[] = []
  if (intake.definition.meaning.trim()) premises.push({ label: '言葉の定義', value: intake.definition.meaning })
  if (intake.client.name.trim()) premises.push({ label: '依頼人', value: intake.client.name })
  if (intake.area?.trim()) premises.push({ label: '場所', value: intake.area })
  if (intake.scale) premises.push({ label: '規模', value: intake.scale === 'single' ? '1店舗' : `チェーン${intake.storeCount ?? ''}店舗` })
  for (const x of intake.extras ?? []) if (x.value.trim()) premises.push({ label: x.label, value: x.value })
  return {
    caseId: a.caseId,
    premises,
    numericTarget: intake.target.multiplier > 1,
    years: intake.target.years,
    ws: a.ws,
    pins: a.pins,
    motives: a.motives,
    warrant: a.warrant,
    pitches: a.report.cards.map((c) => ({
      measureKey: c.measureKey,
      premise: [c.premiseDefinition, c.premiseClient, c.premiseTarget].join('／'),
      current: c.current,
      goal: c.goal,
      where: c.where,
      effect: c.effect,
    })),
    finalAnswer: a.warrant.finalAnswer,
  }
}

export function scoreInputFromModel(caseId: string, v: ModelView): ScoreInput {
  return {
    caseId,
    premises: v.premises,
    numericTarget: v.intake.target.multiplier > 1,
    years: v.intake.target.years,
    ws: v.ws,
    pins: v.pins,
    motives: {},
    warrant: null,
    pitches: v.pitches.map((p) => ({ ...p })),
    finalAnswer: '',
  }
}

/* ---------------- 部品 ---------------- */

const has = (text: string, re: RegExp) => re.test(text)

function rootKids(tree: EvidenceTree): string[] {
  const root = tree.nodes[tree.rootId]
  return (root?.children ?? []).map((id) => tree.nodes[id]?.label ?? '')
}

function depth(tree: EvidenceTree, id = tree.rootId): number {
  const n = tree.nodes[id]
  if (!n || n.children.length === 0) return 0
  return 1 + Math.max(...n.children.map((c) => depth(tree, c)))
}

export function matchDecompositions(ws: EvidenceWorkspace, ideal: IdealAnswer | null): string[] {
  const pats = ideal?.decompositionPatterns ?? []
  const out: string[] = []
  for (const s of ws.sheets) {
    const root = s.tree.nodes[s.tree.rootId]
    if (!root?.split) continue
    const kids = rootKids(s.tree)
    let best: { name: string; size: number } | null = null
    for (const p of pats) {
      if (p.op !== root.split.kind) continue
      const hit = p.groups.filter((g) => kids.some((k) => g.some((w) => k.includes(w)))).length
      const need = p.need ?? p.groups.length
      if (hit >= need && (!best || hit > best.size)) best = { name: p.name, size: hit }
    }
    if (best && !out.includes(best.name)) out.push(best.name)
  }
  return out
}

function measureTexts(ws: EvidenceWorkspace): string[] {
  return ws.sheets.flatMap((s) => Object.values(s.measures).flat().map((m) => m.text.trim())).filter(Boolean)
}

function pinLabels(ws: EvidenceWorkspace, pins: string[]): string[] {
  return pins.flatMap((k) => {
    const { sheetId, nodeId } = parsePinKey(k)
    const n = ws.sheets.find((s) => s.id === sheetId)?.tree.nodes[nodeId]
    return n ? [n.label] : []
  })
}

/** 系統（hotSpot）ごとのキーワード一致 */
export function lineageOf(text: string, ideal: IdealAnswer | null): { id: string; name: string; hits: string[] } | null {
  let best: { id: string; name: string; hits: string[] } | null = null
  for (const h of ideal?.hotSpots ?? []) {
    const hits = h.keywords.filter((k) => text.includes(k))
    if (hits.length && (!best || hits.length > best.hits.length)) best = { id: h.id, name: h.name, hits }
  }
  return best
}

const REASONS: [string, RegExp][] = [
  ['立地', /立地|駅|人口|地域|地元|商圏|都市|郊外/],
  ['顧客', /顧客|客層|中高年|富裕|若年|ファミリー|常連|来店|高齢/],
  ['競合', /競合|EC|ＥＣ|SPA|モール|スーパー|専門店|勝て/],
  ['自社', /強み|弱み|主因|課題|信頼|伸びしろ/],
]

/* ---------------- 採点本体 ---------------- */

export function scoreByRubric(input: ScoreInput, opts: { closest?: boolean } = {}): ScoreResult {
  const ideal = getIdeal(input.caseId)
  const crit: CriterionScore[] = []
  const push = (id: CriterionId, score: number, feedback: string) =>
    crit.push({ id, name: NAME[id], score: clamp(score, 0, MAX[id]), max: MAX[id], feedback })

  /* 1 前提 */
  const ptext = input.premises.map((p) => `${p.label} ${p.value}`).join(' ')
  const cats = [
    has(ptext, /対象|場所|立地|駅|エリア|都市|郊外|地域/),
    has(ptext, /顧客|客層|中高年|若年|ファミリー/),
    input.years > 0 || has(ptext, /時間軸|期間|\d+年/),
    has(ptext, /競合/),
    has(ptext, /店舗|規模/),
  ].filter(Boolean).length
  const goalText = input.premises.filter((p) => /ゴール|目標/.test(p.label)).map((p) => p.value).join(' ')
  const numericGoal = input.numericTarget || /\d/.test(goalText)
  const hasDef = input.premises.some((p) => /定義/.test(p.label))
  {
    const s = (cats >= 2 ? 8 : cats * 3) + (numericGoal ? 5 : goalText ? 2 : 0) + (hasDef ? 2 : 0)
    const fb =
      cats < 2
        ? '立地・顧客層・期間のうち2つ以上を置く'
        : !numericGoal
          ? 'ゴールを数値で置く'
          : !hasDef
            ? '売上の定義（範囲）も置けるとよい'
            : '前提とゴールが揃っている'
    push('premise', s, fb)
  }

  /* 2 分解 */
  const sheets = input.ws.sheets.filter((s) => (s.tree.nodes[s.tree.rootId]?.children.length ?? 0) >= 2)
  const accepted = matchDecompositions(input.ws, ideal)
  const maxDepth = Math.max(0, ...input.ws.sheets.map((s) => depth(s.tree)))
  {
    let s = 0
    if (ideal?.decompositionPatterns) s += accepted.length ? 10 : sheets.length ? 4 : 0
    else s += sheets.some((x) => x.tree.nodes[x.tree.rootId]?.split?.kind === 'mul') ? 10 : sheets.length ? 6 : 0
    s += maxDepth >= 2 ? 5 : maxDepth === 1 ? 2 : 0
    s += sheets.length ? 3 : 0
    s += sheets.length >= 2 ? 2 : 0
    const fb = !sheets.length
      ? '売上を2つ以上の要素に分解する'
      : ideal?.decompositionPatterns && !accepted.length
        ? `許容する分解（${ideal.decompositionPatterns.map((p) => p.name).join('／')}）のどれかで切る`
        : maxDepth < 2
          ? 'もう一段深く分解する'
          : `${accepted.join('・') || '分解'}で2段以上切れている`
    push('decomposition', s, fb)
  }

  /* 3 絞り込みの理由 */
  const pins = input.pins
  const labels = pinLabels(input.ws, pins)
  const motives = pins.map((k) => input.motives[k] ?? '').filter((m) => m.trim().length >= 6)
  const reasonText = [...motives, ...input.pitches.map((p) => p.current)].join(' ')
  const reasonHits = REASONS.filter(([, re]) => re.test(reasonText)).map(([n]) => n)
  const mtexts = measureTexts(input.ws)
  const pinLineage = lineageOf(labels.join(' '), ideal)
  const allLineage = lineageOf([...labels, ...mtexts].join(' '), ideal)
  {
    let s = pins.length >= 1 && pins.length <= 3 ? 6 : 0
    s += Math.min(6, reasonHits.length * 2)
    s += pins.length ? Math.round((motives.length / pins.length) * 3) : 0
    if (ideal) s += pinLineage ? 5 : allLineage ? 2 : 0
    else s += labels.some((l, i) => l && depthOfPin(input.ws, pins[i]) >= 2) ? 5 : pins.length ? 2 : 0
    const fb = !pins.length
      ? '狙う箱（赤ピン）を1〜3個決める'
      : reasonHits.length < 2
        ? '立地・顧客・競合から狙う理由を言う'
        : motives.length < pins.length
          ? '各ピンに動機を一行書く'
          : ideal && !pinLineage
            ? `狙う箱を系統（${ideal.hotSpots.map((h) => h.axes.join('・')).join(' ／ ')}）に寄せる`
            : '狙いと理由がつながっている'
    push('focus', s, fb)
  }

  /* 4 施策 */
  const allText = [...mtexts, ...input.pitches.flatMap((p) => [p.where, p.effect]), input.finalAnswer].join(' ')
  const rejected = (ideal?.rejected ?? []).filter((r) => r.keywords.some((k) => allText.includes(k)))
  const pinsWithMeasure = pins.filter((k) => {
    const { sheetId, nodeId } = parsePinKey(k)
    const sh = input.ws.sheets.find((s) => s.id === sheetId)
    if ((sh?.measures[nodeId] ?? []).some((m) => m.text.trim())) return true
    // 別の切り口の同名ノードや、施策文でその箱に触れていれば対応ありとみなす
    const label = (sh?.tree.nodes[nodeId]?.label ?? '').replace(/[（(].*$/, '').trim()
    return !!label && mtexts.some((t) => t.includes(label))
  }).length
  const avgLen = mtexts.length ? mtexts.reduce((a, t) => a + t.length, 0) / mtexts.length : 0
  const kwHits = new Set((ideal?.hotSpots ?? []).flatMap((h) => h.keywords.filter((k) => mtexts.join(' ').includes(k))))
  {
    let s = mtexts.length >= 2 ? 8 : mtexts.length * 4
    s += pins.length ? Math.round((pinsWithMeasure / pins.length) * 5) : mtexts.length ? 2 : 0
    s += avgLen >= 40 ? 6 : avgLen >= 20 ? 4 : avgLen >= 10 ? 2 : 0
    if (ideal) s += kwHits.size >= 3 ? 6 : kwHits.size >= 1 ? 3 : 0
    else s += mtexts.length >= 3 ? 6 : mtexts.length ? 3 : 0
    s -= rejected.length * 8
    const fb = rejected.length
      ? `不可：${rejected.map((r) => r.text).join('／')}`
      : mtexts.length < 2
        ? '狙った箱にひも付いた施策を2つ以上出す'
        : pins.length && pinsWithMeasure < pins.length
          ? 'すべての狙う箱に施策をつける'
          : avgLen < 20
            ? '施策の中身（誰に・何を・どうやって）を具体的に'
            : '具体策が狙いに沿って出ている'
    push('measures', s, fb)
  }

  /* 5 話し方 */
  {
    const fields = input.pitches.flatMap((p) => [p.premise, p.current, p.goal, p.where, p.effect])
    const filled = fields.filter((f) => f.trim().length >= 2).length
    let s = fields.length ? Math.round((filled / fields.length) * 8) : 0
    const eff = input.pitches.map((p) => p.effect).join(' ')
    if (/\d|＋|%|億|倍/.test(eff)) s += 3
    else if (/により|ことで|につなが|増え|上が|伸ば/.test(eff)) s += 2
    const lead = (input.finalAnswer.trim() || input.pitches[0]?.where || '').trim()
    if (lead && !/^(まず|前提|現状|えー|あの)/.test(lead)) s += 4
    const fb = !input.pitches.length
      ? '発表する施策の台本を作る'
      : filled < fields.length
        ? '台本の空欄（前提〜効果）を埋める'
        : !/\d|＋|%|億|倍/.test(eff)
          ? '効果に数字か仕組みを入れる'
          : '結論から、効果まで言えている'
    push('speech', s, fb)
  }

  /* 6 評価 */
  {
    const w = input.warrant
    let s = 0
    let fb = '評価軸を2本以上置いて○△✖をつける'
    if (w) {
      const axes = namedAxes(w)
      const ms = collectMeasures(input.ws, input.pins)
      if (axes.length >= 2) s += 2
      if (axes.length >= 2 && ms.length && ms.every((m) => isFullyRated(w, m.key, axes))) s += 2
      const top = rankMeasures(w, ms)[0]
      if (top && input.pitches[0]?.measureKey === top.key) s += 1
      if (s >= 4) fb = s === 5 ? '評価と発表順が一致している' : '1位の施策から発表する'
      else if (axes.length >= 2) fb = 'すべての施策を評価する'
    }
    push('evaluation', s, fb)
  }

  const total = crit.reduce((a, c) => a + c.score, 0)
  const result: ScoreResult = {
    source: 'rule',
    total,
    grade: letterFromTotal(total),
    criteria: crit,
    reach: reachFromTotal(total),
    comment: ruleComment(crit, total),
  }
  if (opts.closest !== false) {
    const c = closestStudent(input)
    if (c) result.closest = c
  }
  return result
}

function depthOfPin(ws: EvidenceWorkspace, key: string): number {
  const { sheetId, nodeId } = parsePinKey(key)
  const t = ws.sheets.find((s) => s.id === sheetId)?.tree
  let d = 0
  let n = t?.nodes[nodeId]
  while (n?.parentId && t) {
    d++
    n = t.nodes[n.parentId]
  }
  return d
}

function ruleComment(crit: CriterionScore[], total: number): string {
  const weak = [...crit].sort((a, b) => a.score / a.max - b.score / b.max)[0]
  const strong = [...crit].sort((a, b) => b.score / b.max - a.score / a.max)[0]
  if (total >= 85) return `合格圏。${strong.name}が強い。仕上げは「${weak.feedback}」。`
  return `${strong.name}は形になっている。次は${weak.name}：${weak.feedback}。`
}

/* ---------------- 近い生徒 ---------------- */

function features(input: ScoreInput) {
  const ideal = getIdeal(input.caseId)
  const text = [...pinLabels(input.ws, input.pins), ...measureTexts(input.ws)].join(' ')
  const kws = new Set((ideal?.hotSpots ?? []).flatMap((h) => h.keywords.filter((k) => text.includes(k))))
  return { decomp: matchDecompositions(input.ws, ideal), lineage: lineageOf(text, ideal)?.id ?? null, kws }
}

export function closestStudent(input: ScoreInput): ScoreResult['closest'] | undefined {
  const students = getModelStudents(input.caseId)
  if (!students.length) return undefined
  const me = features(input)
  let best: { sim: number; no: number; title: string; kws: Set<string> } | null = null
  for (const st of students) {
    const f = features(scoreInputFromModel(input.caseId, buildModelView(st, 'GOD')))
    const inter = [...f.kws].filter((k) => me.kws.has(k)).length
    const union = new Set([...f.kws, ...me.kws]).size || 1
    const sim =
      (f.lineage && f.lineage === me.lineage ? 3 : 0) +
      2 * f.decomp.filter((d) => me.decomp.includes(d)).length +
      (3 * inter) / union
    if (!best || sim > best.sim) best = { sim, no: st.no, title: st.title, kws: f.kws }
  }
  if (!best) return undefined
  const lack = [...best.kws].filter((k) => !me.kws.has(k)).slice(0, 3)
  return {
    caseId: input.caseId,
    no: best.no,
    title: best.title,
    missing: lack.length ? `${lack.map((k) => `「${k}」`).join('')}に触れていない` : '—',
  }
}
