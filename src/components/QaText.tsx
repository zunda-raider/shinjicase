/** 〔質疑n〕を小さな黄色チップにして表示 */
export function QaText({ text }: { text: string }) {
  const parts = text.split(/(〔質疑[^〕]*〕)/)
  return (
    <>
      {parts.map((p, i) =>
        /^〔質疑/.test(p) ? (
          <span key={i} className="qa-chip">
            {p.slice(1, -1)}
          </span>
        ) : (
          p
        ),
      )}
    </>
  )
}

export function QaChip({ label }: { label?: string }) {
  if (!label) return null
  return <span className="qa-chip">{label}</span>
}
