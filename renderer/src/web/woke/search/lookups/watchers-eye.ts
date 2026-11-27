// "grace", "watcher" or a Watcher's Eye mod's words in the search palette:
// that aura's Watcher's Eye mods, or the mod, with a button that opens the
// Watcher's Eye finder on it.
import { matchRank } from '../search'
import { gameIcon } from '../../ui/game-icons'
import { WATCHERS_EYE_TYPE } from '../../watchers-eye/widget'
import { WATCHERS_EYE, WE_AURAS } from '../../watchers-eye/mods'
import type { WeMod } from '../../watchers-eye/mods'
import type { Lookup, LookupCard } from './types'

const GROUP = "Watcher's Eye mods"
// The jewel's own art, the eye glyph until the item data is read.
const icon = () => gameIcon(WATCHERS_EYE, 'UNIQUE') ?? 'fas fa-eye'
const MAX_MODS = 3

const words = (s: string) => s.toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter(Boolean)

// Every query word of 3 letters or more starts a word of the line, and
// together they're at least 6 letters ("life" alone isn't enough).
function modMatches (mod: WeMod, q: string[]): boolean {
  const lw = words(mod.line)
  const qw = q.filter(w => w.length >= 3 && !/^\d+$/.test(w))
  if (!qw.length || qw.join('').length < 6) return false
  return qw.every(w => lw.some(l => l.startsWith(w)))
}

export function watchersEyeLookup (mods: readonly WeMod[] | null): Lookup {
  return (query, ctx) => {
    const q = query.trim()
    if (q.length < 4 || !ctx.tools.has(WATCHERS_EYE_TYPE)) return []
    const out: LookupCard[] = []
    // "purity" is four auras: a card each.
    const auras = WE_AURAS.filter(a => matchRank(a, q) === 0)
    const tool = matchRank("Watcher's Eye finder", q) === 0 || matchRank('Watchers Eye', q) === 0
    for (const aura of tool && !auras.length ? [null] : auras) {
      const list = aura ? (mods ?? []).filter(m => m.aura === aura) : []
      out.push({
        id: aura ? `we-aura:${aura}` : 'we-finder',
        group: GROUP,
        name: aura ? `${aura} on Watcher's Eye` : "Watcher's Eye finder",
        sub: aura ? `${list.length || 'Its'} Watcher's Eye mods, in the finder` : 'Every mod for the auras you run, priced in one search',
        icon: icon(),
        tip: { name: WATCHERS_EYE },
        sections: aura && list.length
          ? [{ label: `What Watcher's Eye can roll for ${aura}`, text: list.map(m => m.line) }]
          : [{ text: ["Tick the auras you run (your PoB build's start ticked), pick the Watcher's Eye mods you want, and price a jewel with them: one trade search, in the price check, or on the trade site."] }],
        actions: [aura ? { label: 'Open in the finder', open: { tool: WATCHERS_EYE_TYPE, id: `aura:${aura}` } } : { label: 'Open the finder', tool: WATCHERS_EYE_TYPE }]
      })
    }
    const qw = words(q)
    const hits = (mods ?? []).filter(m => modMatches(m, qw)).slice(0, MAX_MODS)
    for (const m of hits) {
      out.push({
        id: `we-mod:${m.id}`,
        group: GROUP,
        name: m.line,
        sub: `Watcher's Eye · ${m.aura}`,
        icon: icon(),
        tip: { name: WATCHERS_EYE },
        sections: [{ label: `Watcher's Eye mod, while affected by ${m.aura}`, text: [m.line] }],
        actions: [{ label: 'Pick it in the finder', open: { tool: WATCHERS_EYE_TYPE, id: `mod:${m.id}` } }]
      })
    }
    return out
  }
}
