/** 事実・現状を短くまとめたカード。カテゴリで色分けする。 */
export const FACT_CATEGORIES = ['数字', '収支', '競合', '市場・人口', '顧客', '強み弱み', '課題', 'その他'] as const
export type FactCategory = (typeof FACT_CATEGORIES)[number]

export interface FactCard {
  category: FactCategory
  text: string
  /** 質疑由来（GOD のみ表示） */
  qa?: string
}

/** 「競合：…」のような先頭ラベルからカテゴリを推定（なければ その他） */
export function factCardFromLine(line: string): FactCard {
  const t = line.trim()
  const m = t.match(/^([^：:]{1,6})[：:]\s*(.+)$/)
  if (m) {
    const label = m[1]
    const cat = (FACT_CATEGORIES as readonly string[]).find(
      (c) => c === label || c.split('・').some((x) => label.includes(x)) || (c === '強み弱み' && /強み|弱み/.test(label)),
    ) as FactCategory | undefined
    if (cat) return { category: cat, text: t }
  }
  return { category: 'その他', text: t }
}
