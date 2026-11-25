// What a gem's tooltip adds (Guy's pick I5 in the tooltip audit, 2026-11-25):
// the prices of its versions on poe.ninja, level and quality, and one line on
// where to get it (quest, vendor, transfigure, drop). Pure: item-tip.ts passes
// the data. Loaded on the first gem hover.
import { gemDrop } from '../../search/lookups/gem-drops'
import { transfiguredBase } from '../../search/lookups/gems'
import type { GemTable } from '../../search/lookups/gems'
import type { TipLine, TipPart } from './tip-content'

const part = (text: string, tone: TipPart['tone']): TipPart => ({ text, tone })

// "20/20c" -> level 20, quality 20, corrupted.
function versionKey (variant: string): [number, number, number] {
  const m = /^(\d+)(?:\/(\d+))?(c)?$/.exec(variant)
  return m ? [Number(m[1]), Number(m[2] ?? 0), m[3] ? 1 : 0] : [999, 0, 0]
}
const label = (variant: string) => variant.replace(/c$/, ' corrupted')

const MOST_VERSIONS = 10

/** Its versions by level, then quality, then corruption, two to a line. */
export function gemLadder (rows: Array<{ variant?: string, chaos: number }>, hovered: string | undefined, format: (chaos: number) => string): TipLine[] {
  const versions = rows.filter((r): r is { variant: string, chaos: number } => !!r.variant)
    .sort((a, b) => {
      const x = versionKey(a.variant)
      const y = versionKey(b.variant)
      return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
    })
  if (versions.length < 2) return []
  // Too many: the lowest go first, the hovered one always stays.
  const top = versions.slice(-MOST_VERSIONS)
  const own = versions.find(v => v.variant === hovered)
  const shown = own && !top.includes(own) ? [own, ...top.slice(1)] : top
  const lines: TipLine[] = []
  for (let i = 0; i < shown.length; i += 2) {
    const line: TipLine = []
    for (const v of shown.slice(i, i + 2)) {
      if (line.length) line.push(part('   ', 'label'))
      line.push(part(`${label(v.variant)} `, v.variant === hovered ? 'value' : 'label'), part(format(v.chaos), 'value'))
    }
    lines.push(line)
  }
  if (versions.length > shown.length) lines.unshift([part(`${versions.length - shown.length} lower versions not shown`, 'dim')])
  return lines
}

/** Where the gem comes from, in one line, or null when the data doesn't say. */
export function gemSource (name: string, table: GemTable | null): string | null {
  const drop = gemDrop(name, n => !!table?.[n])
  if (drop) return drop.sub
  if (!table) return null
  const base = transfiguredBase(name, table)
  if (base) return `Transfigured ${base}: Divine Font in the Labyrinth`
  const entry = table[name]
  if (!entry) return null
  const first = (k: 'q' | 'v') => entry.s.filter(s => s[3] === k).sort((a, b) => a[0] - b[0])[0]
  const quest = first('q')
  if (quest) return `Quest reward, Act ${quest[0]} (${quest[1]})`
  const vendor = first('v')
  if (vendor) return `Sold by ${vendor[2]}, Act ${vendor[0]}`
  if (name.startsWith('Vaal ') && table[name.slice(5)]) return `Vaal Orb on a ${name.slice(5)}`
  return null
}
