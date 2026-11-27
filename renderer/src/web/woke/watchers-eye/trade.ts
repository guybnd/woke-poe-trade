// A Watcher's Eye mod's trade stat, from the app's stat data: the line with
// its numbers as "#", as the stat matchers write it.
import { STAT_BY_MATCH_STR } from '@/assets/data'
import type { WeMod } from './mods'

const RANGE = /\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)/g
const NUMBER = /(?<![\w#])\d+(?:\.\d+)?/g

// The ways a matcher can write the line: a range's sign kept or not, fixed
// numbers ("4 seconds") kept or hashed too.
function shapes (copy: string): string[] {
  const out: string[] = []
  for (const ranged of [copy.replace(/[+-]?\((-?[\d.]+)--?[\d.]+\)/g, '#'), copy.replace(RANGE, '#')]) {
    const hashed = ranged.replace(NUMBER, '#')
    for (const t of [ranged, hashed, hashed.replace(/\+(?=#)/g, '')]) out.push(t, t.replace(/\n/g, ' '))
  }
  return [...new Set(out)]
}

const cache = new Map<string, string | null>()

export function weStatId (mod: WeMod): string | null {
  let id = cache.get(mod.id)
  if (id !== undefined) return id
  id = null
  for (const s of shapes(mod.copy.replace(/\r/g, ''))) {
    const ids = STAT_BY_MATCH_STR(s)?.stat.trade.ids.explicit
    if (ids?.length) { id = ids[0]; break }
  }
  cache.set(mod.id, id)
  return id
}
