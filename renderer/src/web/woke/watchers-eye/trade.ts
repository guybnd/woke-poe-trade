// A Watcher's Eye mod's trade stat, from the app's stat data: the line with
// its numbers as "#", as the stat's English ref writes it (the same in every
// client language, unlike the matchers).
import { STAT_BY_REF_V2 } from '@/assets/data'
import type { Stat } from '@/assets/data'
import type { WeMod } from './mods'

const RANGE = /\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)/g
const NUMBER = /(?<![\w#])\d+(?:\.\d+)?/g

// The ways a matcher can write the line: a range's sign kept or not, fixed
// numbers ("4 seconds") kept or hashed too.
function shapes (copy: string): string[] {
  const out: string[] = []
  for (const ranged of [copy.replace(/[+-]?\((-?[\d.]+)--?[\d.]+\)/g, '#'), copy.replace(RANGE, '#')]) {
    const hashed = ranged.replace(NUMBER, '#')
    for (const t of [ranged, hashed, hashed.replace(/\+(?=#)/g, ''), ranged.replace(/-#/g, '+#')]) out.push(t, t.replace(/\n/g, ' '))
  }
  return [...new Set(out)]
}

function byRef (ref: string): Stat | undefined {
  const found = STAT_BY_REF_V2(ref)
  if (found && 'stats' in found) return found.stats.find(s => s.ref === ref && s.trade.ids.explicit?.length)
  return found
}

// Found ids only: a miss (stat data not read yet) is looked up again next time.
const cache = new Map<string, string>()

export function weStatId (mod: WeMod): string | null {
  const known = cache.get(mod.id)
  if (known) return known
  for (const s of shapes(mod.copy.replace(/\r/g, ''))) {
    const ids = byRef(s)?.trade.ids.explicit
    if (ids?.length) { cache.set(mod.id, ids[0]); return ids[0] }
  }
  return null
}
