import type { IdealAnswer } from '../data/ideals/types'
import type { ModelMode, ModelStudent } from '../data/models/types'

export interface ModelReview {
  title: string
  /** 主軸・狙い（原文） */
  focus: string
  /** GHOST 到達度表があれば */
  reach?: { pattern: string; axis: string; grade: string; missing: string }
  /** 合格条件への対応（ルーブリックの合格ライン ＋ 原文からの短い根拠） */
  passMap: { name: string; passLine: string; evidence: string }[]
  /** GOD のみ：〔質疑n〕で加わった文の抜粋 */
  qaAdded: { tag: string; excerpt: string }[]
  /** 系統（hot_spots）に原文キーワードが触れていればその名前と理由（原文） */
  lineage?: { name: string; reason: string }
}

const QA_RE = /〔質疑([0-9・]+)〕/g

function allText(st: ModelStudent): string {
  return [
    st.focus,
    ...st.current,
    ...st.premises.map(([, v]) => v),
    ...st.measures.map((m) => `${m.name} ${m.body} ${m.reason ?? ''}`),
    ...st.notes.map((n) => n.text),
    ...st.factCards.map((f) => f.text),
  ].join('\n')
}

function excerptsWithQa(text: string): { tag: string; excerpt: string }[] {
  const out: { tag: string; excerpt: string }[] = []
  const seen = new Set<string>()
  for (const line of text.split(/\n|(?<=。)/)) {
    QA_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = QA_RE.exec(line))) {
      const tag = `〔質疑${m[1]}〕`
      const key = tag + line.slice(0, 40)
      if (seen.has(key)) continue
      seen.add(key)
      const excerpt = line.replace(/\s+/g, ' ').trim().slice(0, 80)
      if (excerpt) out.push({ tag, excerpt })
    }
  }
  return out
}

function evidenceFor(passId: string, st: ModelStudent, text: string): string {
  if (passId === 'premise') {
    const labels = st.premises.map(([l]) => l).filter(Boolean)
    return labels.length ? `前提: ${labels.join('・')}` : ''
  }
  if (passId === 'decomposition') {
    return st.sheets.map((s) => s.name).filter(Boolean).join('／')
  }
  if (passId === 'focusReason') {
    return st.focus.trim()
  }
  if (passId === 'measures') {
    const names = st.measures.map((m) => m.name.replace(/（最優先）$/, '')).filter(Boolean)
    return names.length ? names.join('・') : ''
  }
  if (passId === 'conclusionFirst') {
    return st.measures.some((m) => m.role === 'メイン') ? 'メインの施策あり' : ''
  }
  // generic: first 60 chars of focus if any keyword-ish
  void text
  return ''
}

/** 出典の reach / focus / 施策 / 〔質疑〕 / ルーブリックだけから講評を組む。褒め言葉は作らない。 */
export function buildModelReview(
  st: ModelStudent,
  mode: ModelMode,
  ideal: IdealAnswer | null,
): ModelReview {
  const text = allText(st)
  const passMap =
    ideal?.requiredElements.map((el) => ({
      name: el.name,
      passLine: el.passLine,
      evidence: evidenceFor(el.id, st, text),
    })) ?? []

  let lineage: ModelReview['lineage']
  if (ideal?.hotSpots?.length) {
    for (const h of ideal.hotSpots) {
      if (h.keywords.some((k) => text.includes(k) || st.focus.includes(k))) {
        lineage = { name: h.name, reason: h.reason }
        break
      }
    }
  }

  return {
    title: st.title,
    focus: st.focus,
    reach: st.reach,
    passMap,
    qaAdded: mode === 'GOD' ? excerptsWithQa(text) : [],
    lineage,
  }
}
