// The card behind a WInfo "?". One at a time, drawn by HelpCard.vue (mounted once
// in the overlay), so a panel's edge can't cut it off.
import { shallowRef } from 'vue'

// A key row: boxed keys, then what they do.
export interface HelpKey { keys: string, label: string }

// `lines`: each line break in a paragraph starts a new line (item mods, one per line).
export const helpTip = shallowRef<{ owner: object, text: string, keys?: HelpKey[], anchor: DOMRect, lines?: boolean } | null>(null)

export function showHelp (owner: object, target: HTMLElement, text: string, keys?: HelpKey[], opts: { lines?: boolean } = {}) {
  helpTip.value = { owner, text, keys, anchor: target.getBoundingClientRect(), lines: opts.lines }
}

export function hideHelp (owner?: object) {
  if (!owner || helpTip.value?.owner === owner) helpTip.value = null
}

// A blank line starts a new paragraph.
export function helpParagraphs (text: string): string[] {
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
}

// Help text format (Guy 2026-11-25: a "?" reads as a lead line and bullets, not a
// wall of text). In `text`:
//   - a blank line starts a paragraph; the first one is the lead, brighter
//   - a line starting "- " is a bullet; bullets in a row make one list
//   - **Has** is bold (control and term names)
//   - [[Right-click]] or [[Shift + Click]] is boxed keys, the way hotkeys look
// Plain text with none of these shows as it did.
export type HelpInline = { k: 'text' | 'b' | 'kbd', v: string }
export type HelpBlock = { k: 'p', parts: HelpInline[] } | { k: 'ul', items: HelpInline[][] }

const INLINE = /\*\*(.+?)\*\*|\[\[(.+?)\]\]/g

export function helpInline (text: string): HelpInline[] {
  const out: HelpInline[] = []
  let at = 0
  for (const m of text.matchAll(INLINE)) {
    if (m.index! > at) out.push({ k: 'text', v: text.slice(at, m.index) })
    out.push(m[1] != null ? { k: 'b', v: m[1] } : { k: 'kbd', v: m[2] })
    at = m.index! + m[0].length
  }
  if (at < text.length) out.push({ k: 'text', v: text.slice(at) })
  return out
}

export function helpBlocks (text: string): HelpBlock[] {
  const blocks: HelpBlock[] = []
  for (const para of helpParagraphs(text)) {
    let words: string[] = []
    let list: HelpInline[][] | null = null
    const flushWords = () => {
      if (words.length) blocks.push({ k: 'p', parts: helpInline(words.join(' ')) })
      words = []
    }
    for (const raw of para.split('\n')) {
      const line = raw.trim()
      const bullet = /^[-•]\s+(.*)$/.exec(line)
      if (bullet) {
        flushWords()
        if (!list) { list = []; blocks.push({ k: 'ul', items: list }) }
        list.push(helpInline(bullet[1]))
      } else if (line) {
        list = null
        words.push(line)
      }
    }
    flushWords()
  }
  return blocks
}

// The same text with the markup taken out, for screen readers and logs.
export function helpPlain (text: string): string {
  const pieces = helpBlocks(text).flatMap(b => b.k === 'p' ? [b.parts] : b.items)
    .map(parts => parts.map(i => i.v).join('').trim()).filter(Boolean)
  // Each piece ends as a sentence, so bullets don't run together or get "..".
  return pieces.map(t => /[.!?:…]$/.test(t) ? t : `${t}.`).join(' ')
}

// Where the card goes, in screen pixels: right of the "?", else left of it, kept
// inside the window.
export function placeHelp (
  anchor: { left: number, right: number, top: number },
  card: { width: number, height: number },
  screen: { width: number, height: number }
): { left: number, top: number } {
  const GAP = 8
  const fitsRight = anchor.right + GAP + card.width <= screen.width - GAP
  const left = fitsRight ? anchor.right + GAP : Math.max(GAP, anchor.left - GAP - card.width)
  const top = Math.max(GAP, Math.min(anchor.top - 4, screen.height - card.height - GAP))
  return { left, top }
}
