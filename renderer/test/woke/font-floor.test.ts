// No text under 11px (charter P19). Every font size written in px (or as
// calc(Npx * scale)) in the app's styles must be 11px or more. Icon glyphs
// (a chevron, a pin) may be smaller: they're listed here with why. The list only
// shrinks; a new line needs a real reason, not "it didn't fit".
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../src/web')

const ALLOWED: Record<string, string> = {
  'price-check/trends/PriceTrend.vue|.chev': 'chevron icon',
  'price-check/filters/FilterName.vue|font-size: calc(10px': 'swap icon beside the name',
  'woke/ui/controls.css|font: 600 calc(9px': 'ON/OFF inside the switch track',
  'woke/ui/controls.css|font: calc(10px': 'ON/OFF inside the PoE-art switch track',
  'woke/ui/SizeSettings.vue|.more i': 'chevron icon',
  'woke/net-worth/ItemTable.vue|.pin': 'pin icon',
  'woke/net-worth/ItemTable.vue|.held': 'lock icon',
  'woke/net-worth/NetWorthPanel.vue|.toggle i': 'chevron icon',
  'woke/net-worth/NetWorthPanel.vue|.fold i': 'fold chevron',
  'woke/net-worth/NetWorthPanel.vue|.groupHead > i': 'fold chevron'
}

function files (dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) return files(p)
    return /\.(vue|css)$/.test(name) ? [p] : []
  })
}

// font-size: 10px / font-size: calc(10px * ...) / font: 600 calc(9px * ...) / font: 10px/1.2 ...
const SIZE = /font(?:-size)?\s*:[^;{}]*?(?:^|[\s(:])(\d+(?:\.\d+)?)px/g

describe('font floor', () => {
  it('has no font size under 11px outside the icon list', () => {
    const found: string[] = []
    const used = new Set<string>()
    for (const file of files(ROOT)) {
      const rel = path.relative(ROOT, file).replace(/\\/g, '/')
      readFileSync(file, 'utf-8').split('\n').forEach((line, i) => {
        for (const m of line.matchAll(SIZE)) {
          if (Number(m[1]) >= 11) continue
          // A fallback inside var(--w-fs-xs, 10px) isn't the size.
          if (/var\(--w-fs-[a-z]+,\s*$/.test(line.slice(0, m.index! + m[0].length - m[1].length - 2))) continue
          const key = Object.keys(ALLOWED).find(k => k.startsWith(rel + '|') && line.includes(k.slice(rel.length + 1)))
          if (key) { used.add(key); continue }
          found.push(`${rel}:${i + 1}  ${line.trim()}`)
        }
      })
    }
    expect(found, 'text under 11px: use var(--w-fs-xs) or more').toEqual([])
    // An entry nothing matches any more comes off the list.
    expect(Object.keys(ALLOWED).filter(k => !used.has(k))).toEqual([])
  })
})
