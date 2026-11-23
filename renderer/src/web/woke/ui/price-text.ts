// Splits a price text ("6.9 div", "1,436c", "281 per c") so each currency unit
// can be drawn as its icon (WPriceText.vue). raw is the unit's own text, kept
// for screen readers and copying.

export interface PricePart { text: string, unit?: 'c' | 'div', raw?: string }

// A unit only counts after a number or "per".
const UNIT = /(\d[\d,.]*|per)(\s?)(c|div)(?![a-z])/g

export function splitPriceText (s: string): PricePart[] {
  const out: PricePart[] = []
  let at = 0
  for (const m of s.matchAll(UNIT)) {
    if (m.index! > at) out.push({ text: s.slice(at, m.index) })
    const per = m[1] === 'per'
    out.push({ text: per ? 'per ' : m[1], unit: m[3] as 'c' | 'div', raw: per ? m[3] : m[2] + m[3] })
    at = m.index! + m[0].length
  }
  if (at < s.length) out.push({ text: s.slice(at) })
  return out
}
