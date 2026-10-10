/** 模範解答 Markdown を GHOST（許容解）と GOD（完全解 n 本）に分ける */
export interface ArchiveSections {
  title: string
  ghost: string
  god: { title: string; body: string }[]
  /** 完全解の後ろのまとめ */
  godNote: string
}

export function splitArchive(md: string): ArchiveSections {
  const lines = md.split('\n')
  const h1 = lines.findIndex((l) => l.startsWith('# '))
  const title = h1 >= 0 ? lines[h1].replace(/^#\s+/, '').trim() : ''
  const ghostStart = lines.findIndex((l) => /^#\s+許容解/.test(l))
  const godStart = lines.findIndex((l) => /^#\s+完全解/.test(l))
  const ghost =
    ghostStart >= 0
      ? lines
          .slice(ghostStart + 1, godStart >= 0 ? godStart : undefined)
          .join('\n')
          .replace(/\n-{3,}\s*$/m, '')
          .trim()
      : ''

  const god: { title: string; body: string }[] = []
  let godNote = ''
  if (godStart >= 0) {
    const rest = lines.slice(godStart + 1)
    let cur: { title: string; lines: string[] } | null = null
    for (const l of rest) {
      const m = /^##\s+(.+)$/.exec(l)
      if (m) {
        if (cur) god.push({ title: cur.title, body: cur.lines.join('\n') })
        cur = { title: m[1].trim(), lines: [] }
      } else if (cur) {
        cur.lines.push(l)
      }
    }
    if (cur) god.push({ title: cur.title, body: cur.lines.join('\n') })
    // 最後の本文の「---」以降はまとめ
    if (god.length > 0) {
      const last = god[god.length - 1]
      const parts = last.body.split(/\n-{3,}\n/)
      if (parts.length > 1) {
        last.body = parts[0]
        godNote = parts.slice(1).join('\n').trim()
      }
    }
    for (const g of god) g.body = g.body.replace(/\n-{3,}\s*$/, '').trim()
  }
  return { title, ghost, god, godNote }
}

/** 「完全解1：食品・ギフト・外商に集中」→ { no: '完全解1', name: '食品・ギフト・外商に集中' } */
export function splitGodTitle(t: string): { no: string; name: string } {
  const i = t.indexOf('：')
  return i < 0 ? { no: t, name: '' } : { no: t.slice(0, i), name: t.slice(i + 1) }
}

/** 〔質疑n〕を強調用の span に置換（HTML 文字列に対して） */
export function highlightQa(html: string): string {
  return html.replace(/〔(質疑[0-9０-９・、]+)〕/g, '<span class="qa-chip">$1</span>')
}
