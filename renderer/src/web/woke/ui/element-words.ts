// Splits mod text so Fire, Cold, Lightning, Chaos and Physical can carry a
// hint of their colour (Guy's pick "soft shift"). The colours live in CSS.
export type ElementPart = { text: string, ele?: string }

const WORDS = /\b(Fire|Cold|Lightning|Chaos|Physical)\b/g

export function elementParts (text: string): ElementPart[] {
  const out: ElementPart[] = []
  let at = 0
  for (const m of text.matchAll(WORDS)) {
    if (m.index! > at) out.push({ text: text.slice(at, m.index) })
    out.push({ text: m[0], ele: m[0].toLowerCase() })
    at = m.index! + m[0].length
  }
  if (at < text.length || !out.length) out.push({ text: text.slice(at) })
  return out
}
