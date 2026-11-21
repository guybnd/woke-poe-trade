// A calculator in the search: "70 * 38" or "50d / 7" shows its answer as the
// top row, and Enter copies it. A small parser, never eval.
import type { Lookup, LookupCard, LookupRow } from './types'

// A value with how many times it's in chaos: 0 a plain number, 1 an amount of
// currency (in chaos), -1 "per chaos" on the way to one of the others.
interface Val { v: number, deg: number, pct?: boolean }

type Tok =
  { t: 'num', v: number } |
  { t: 'unit', name: string } |
  { t: 'op', v: '+' | '-' | '*' | '/' | '^' | '%' | '(' | ')' }

const OPS: Record<string, '+' | '-' | '*' | '/' | '^' | '%' | '(' | ')'> = {
  '+': '+', '-': '-', '−': '-', '*': '*', '×': '*', '·': '*', '/': '/', '÷': '/', '^': '^', '%': '%', '(': '(', ')': ')'
}

// "1,200" groups thousands, "1,5" is a decimal comma (as currency maths reads it).
const NUM = /^(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?|\.\d+)/
const WORD = /^[a-z'’]+/i

function tokenize (text: string, unit: (word: string) => string | null): Tok[] | null {
  const out: Tok[] = []
  let s = text.trim()
  while (s) {
    const space = /^\s+/.exec(s)
    if (space) { s = s.slice(space[0].length); continue }
    const num = NUM.exec(s)
    if (num) {
      const raw = num[0]
      let v = Number(/,\d{3}(?:\D|$)/.test(raw) ? raw.replace(/,/g, '') : raw.replace(',', '.'))
      s = s.slice(raw.length)
      // "2k", "1.5m" right after the number.
      const suffix = /^([km])(?![a-z])/i.exec(s)
      if (suffix) {
        v *= suffix[1].toLowerCase() === 'k' ? 1e3 : 1e6
        s = s.slice(1)
      }
      if (!Number.isFinite(v)) return null
      out.push({ t: 'num', v })
      continue
    }
    const op = OPS[s[0]]
    if (op) { out.push({ t: 'op', v: op }); s = s.slice(1); continue }
    const word = WORD.exec(s)
    if (word) {
      const w = word[0]
      // "x" multiplies: "70x38", "70 x 38".
      if (w.toLowerCase() === 'x') { out.push({ t: 'op', v: '*' }); s = s.slice(1); continue }
      // Two words can be one name: "chaos orb", "divine orb".
      const two = /^([a-z'’]+)\s+([a-z'’]+)/i.exec(s)
      const both = two ? unit(`${two[1]} ${two[2]}`) : null
      if (two && both) { out.push({ t: 'unit', name: both }); s = s.slice(two[0].length); continue }
      const name = unit(w)
      if (!name) return null
      out.push({ t: 'unit', name })
      s = s.slice(w.length)
      continue
    }
    return null
  }
  return out
}

export interface CalcResult {
  value: number
  // Which currencies it uses; with `deg` 1 the value is in chaos.
  units: string[]
  deg: number
}

// Works out an expression; null when it isn't one, or isn't sums at all (a
// bare number or "50 div" is left to the other answers).
export function evaluate (text: string, unit: (word: string) => string | null, price: (name: string) => number | null): CalcResult | null {
  const toks = tokenize(text, unit)
  // Nobody types a sum this long; a pasted wall of brackets mustn't recurse away.
  if (!toks?.length || toks.length > 200) return null
  let i = 0
  let ops = 0
  const units = new Set<string>()
  const peek = () => toks[i]
  const isOp = (v: string) => { const t = toks[i]; return t?.t === 'op' && t.v === v }

  function expr (): Val | null {
    let a = term()
    while (a && (isOp('+') || isOp('-'))) {
      const minus = isOp('-')
      i++
      ops++
      const b = term()
      if (!b) return null
      // "200 + 10%" is 220, as on a phone calculator.
      if (b.pct && b.deg === 0) a = { v: a.v * (1 + (minus ? -b.v : b.v)), deg: a.deg }
      else if (a.deg !== b.deg) return null
      else a = { v: minus ? a.v - b.v : a.v + b.v, deg: a.deg }
    }
    return a
  }
  function term (): Val | null {
    let a = unary()
    while (a && (isOp('*') || isOp('/'))) {
      const div = isOp('/')
      i++
      ops++
      const b = unary()
      if (!b) return null
      if (div && b.v === 0) return null
      const deg = div ? a.deg - b.deg : a.deg + b.deg
      if (Math.abs(deg) > 1) return null
      a = { v: div ? a.v / b.v : a.v * b.v, deg }
    }
    return a
  }
  function unary (): Val | null {
    if (isOp('-') || isOp('+')) {
      const neg = isOp('-')
      i++
      const a = unary()
      return a && (neg ? { ...a, v: -a.v } : a)
    }
    return power()
  }
  function power (): Val | null {
    const a = postfix()
    if (!a || !isOp('^')) return a
    i++
    ops++
    const b = unary()
    if (!b || a.deg !== 0 || b.deg !== 0) return null
    return { v: Math.pow(a.v, b.v), deg: 0 }
  }
  function postfix (): Val | null {
    const a = primary()
    // "20%" on its own isn't a sum: it takes another sign to count.
    if (a && isOp('%')) {
      i++
      if (a.deg !== 0) return null
      return { v: a.v / 100, deg: 0, pct: true }
    }
    return a
  }
  function amountOf (name: string): number | null {
    const p = price(name)
    if (p == null || !(p > 0)) return null
    units.add(name)
    return p
  }
  function primary (): Val | null {
    const t = peek()
    if (!t) return null
    if (t.t === 'num') {
      i++
      const next = peek()
      if (next?.t === 'unit') {
        i++
        const p = amountOf(next.name)
        return p == null ? null : { v: t.v * p, deg: 1 }
      }
      return { v: t.v, deg: 0 }
    }
    if (t.t === 'unit') {
      i++
      const p = amountOf(t.name)
      return p == null ? null : { v: p, deg: 1 }
    }
    if (t.v === '(') {
      i++
      const a = expr()
      if (!a || !isOp(')')) return null
      i++
      return a
    }
    return null
  }

  const out = expr()
  if (!out || i !== toks.length || !ops) return null
  if (!Number.isFinite(out.v) || (out.deg !== 0 && out.deg !== 1)) return null
  return { value: out.v, units: [...units], deg: out.deg }
}

// Up to 12 significant digits, so 0.1 + 0.2 reads 0.3.
function tidy (n: number): number {
  return Number(n.toPrecision(12))
}

// Small amounts keep three significant digits, so 1 div / 1000 isn't "0".
function fewDecimals (t: number, decimals: number): boolean {
  return t !== 0 && Math.abs(t) < 10 ** -Math.min(decimals, 6) * 100
}

// "2,660", "7.142857", "0.00417": grouped, with the decimals that matter.
export function calcNumber (n: number, decimals = 6): string {
  const t = tidy(n)
  if (Math.abs(t) >= 1e15) return t.toExponential(6).replace(/\.?0+e/, 'e')
  if (fewDecimals(t, decimals)) return t.toLocaleString('en-US', { maximumSignificantDigits: 3, maximumFractionDigits: 20 })
  return t.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

// What Enter copies: the number as typed into a box, no grouping or exponent.
function copyNumber (n: number, decimals = 6): string {
  const t = tidy(n)
  if (Math.abs(t) >= 1e15) return t.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 0 })
  if (fewDecimals(t, decimals)) return t.toLocaleString('en-US', { useGrouping: false, maximumSignificantDigits: 3, maximumFractionDigits: 20 })
  return t.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: decimals })
}

export function calcLookup (unit: (word: string) => string | null): Lookup {
  return (query, ctx) => {
    const r = evaluate(query, unit, ctx.price)
    if (!r) return []
    const typed = query.trim().replace(/\s+/g, ' ')
    let headline: string
    let copy: string
    const rows: LookupRow[] = []
    if (r.deg === 1) {
      // Money: in divines when you typed divines, else in chaos.
      const inDiv = ctx.divine != null && ctx.divine > 0 && r.units.includes('Divine Orb')
      const div = ctx.divine ? r.value / ctx.divine : null
      headline = inDiv && div != null ? `${calcNumber(div, 2)} div` : `${calcNumber(r.value, 2)} c`
      copy = inDiv && div != null ? copyNumber(div, 2) : copyNumber(r.value, 2)
      rows.push({ label: 'In chaos', value: `${calcNumber(r.value, 2)} c` })
      if (div != null) rows.push({ label: 'In divines', value: `${calcNumber(div, 2)} div` })
    } else {
      headline = calcNumber(r.value)
      copy = copyNumber(r.value)
    }
    const rates: LookupRow[] = r.units.filter(n => n !== 'Chaos Orb')
      .map(n => ({ label: `1 ${n}`, value: `${calcNumber(ctx.price(n)!, 2)} c`, item: { name: n, type: 'Currency' } }))
    const card: LookupCard = {
      id: `answer:calc:${typed}`,
      group: 'Answer',
      name: `${typed} = ${headline}`,
      sub: r.units.length ? 'Calculator, at poe.ninja prices' : 'Calculator',
      icon: 'fas fa-calculator',
      sections: [...(rows.length ? [{ rows }] : []), ...(rates.length ? [{ label: 'Rates', rows: rates }] : [])],
      actions: [{ label: `Copy ${copy}`, copy }]
    }
    return [card]
  }
}
