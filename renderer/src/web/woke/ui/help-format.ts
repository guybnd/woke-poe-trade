// The rules a "?" help text must keep (help format A, Guy 2026-11-25 and
// 2026-11-28: "if it's not formalized it MUST be"). help-format.test.ts runs
// every WInfo `text`, Settings `hint` and showHelp text in the app through
// helpProblems and fails on any problem, so a wall of text can't come back.
//
// The format itself (parsed by helpBlocks in help-tip.ts):
//   Lead line: one short sentence that says what the thing is or does.
//   - One bullet per control, rule or exception, one idea each.
//   **Bold** names a control or term, [[Shift + Click]] boxes keys.
//   A blank line starts a paragraph, for a short closing note.
// Write plain, factual words. No formulas (stack^0.75): say what it does.
//
// Test-only: nothing in the app imports this, so it costs no startup JS.
import { helpBlocks, type HelpInline } from './help-tip'

export const HELP_LIMITS = {
  // The lead, and any paragraph after it.
  lead: 140,
  para: 140,
  bullet: 130,
  bullets: 7,
  // Everything together, with the markup taken out.
  total: 560,
  // Sentences in the lead.
  leadSentences: 2,
  // A `title` hover is a short label (title-tip.ts): longer goes in a WInfo.
  title: 150
}

const plain = (parts: HelpInline[]) => parts.map(p => p.v).join('').trim()
const sentences = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/).filter(Boolean).length

const FORMULA = /\^\s*[\d.(]|\b[a-z]+\s*\^\s*\w|[×*]\s*\(?\s*[a-z]+\s*[-+/]\s*\d/i

export function helpProblems (text: string): string[] {
  const out: string[] = []
  const blocks = helpBlocks(text)
  if (!blocks.length) return out
  const first = blocks[0]
  if (first.k !== 'p') out.push('starts with a bullet: give it a lead line first')
  let total = 0
  let bulletCount = 0
  blocks.forEach((b, i) => {
    if (b.k === 'p') {
      const t = plain(b.parts)
      total += t.length
      const max = i === 0 ? HELP_LIMITS.lead : HELP_LIMITS.para
      if (t.length > max) out.push(`${i === 0 ? 'lead' : 'paragraph'} is ${t.length} characters (max ${max}): split it into "- " bullets: "${t.slice(0, 60)}…"`)
      if (i === 0 && sentences(t) > HELP_LIMITS.leadSentences) out.push(`lead has ${sentences(t)} sentences (max ${HELP_LIMITS.leadSentences}): "${t.slice(0, 60)}…"`)
    } else {
      bulletCount += b.items.length
      for (const item of b.items) {
        const t = plain(item)
        total += t.length
        if (t.length > HELP_LIMITS.bullet) out.push(`bullet is ${t.length} characters (max ${HELP_LIMITS.bullet}): "${t.slice(0, 60)}…"`)
      }
    }
  })
  if (bulletCount > HELP_LIMITS.bullets) out.push(`${bulletCount} bullets (max ${HELP_LIMITS.bullets}): keep the ones a player needs`)
  if (total > HELP_LIMITS.total) out.push(`${total} characters in all (max ${HELP_LIMITS.total}): cut it down`)
  if (FORMULA.test(text)) out.push('has a formula: say what it does in words')
  return out
}
