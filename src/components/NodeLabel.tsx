/** 「来店頻度（平日／休日 × 朝／昼／夜）」→ 1行目：名前、2行目：括弧の中（小さめ） */
function splitLabel(label: string): { main: string; sub: string | null } {
  const m = label.match(/^(.+?)\s*[（(](.+)[）)]\s*$/)
  return m ? { main: m[1], sub: m[2] } : { main: label, sub: null }
}

export function NodeLabel({ label, empty }: { label: string; empty: string }) {
  const t = label.trim()
  if (!t) return <span className="evidence-card__label">{empty}</span>
  const { main, sub } = splitLabel(t)
  return (
    <span className={`evidence-card__label ${main.length > 9 ? 'is-long' : ''}`}>
      {main}
      {sub && <span className="evidence-card__sub">{sub}</span>}
    </span>
  )
}
