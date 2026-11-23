// What map mods give, in the search: "more currency" (or maps, threads) lists
// the mods with that bonus, best first; a mod's name ("fecund", "of venom") or
// part of its text ("monster life") shows each tier's lines and bonuses. Same
// data as the numbers on Map mods' rows (map-mods/bonuses.ts, from poedb).
import { MORE_LABEL, TIER_LABEL, bonusWords } from '../../map-mods/bonuses'
import type { MapBonusData, MapBonusMod, MoreKind } from '../../map-mods/bonuses'
import { matchRank } from '../search'
import type { Lookup, LookupAction, LookupCard, LookupContext, LookupSection } from './types'

// map-mods/widget.ts's MAP_MODS_TYPE; that file pulls in the UI.
const MAP_MODS_TYPE = 'woke-map-mods'

const SOURCE = 'https://poedb.tw/us/Maps_uber_tier'
const MORE_WORDS: Record<string, MoreKind> = {
  'currency': 'currency',
  'maps': 'maps',
  'map': 'maps',
  'threads': 'threads',
  'thread': 'threads',
  'div cards': 'divCards',
  'divination cards': 'divCards',
  'scarabs': 'scarabs'
}
// "more currency", "map mods more currency", "currency map mods", "more maps mods".
const KINDS = '(currency|maps?|threads?|div(?:ination)? cards|scarabs)'
const BONUS_QUERY = [
  new RegExp(`^(?:map mods? (?:with |for )?)?more ${KINDS}(?: map)?(?: mods?)?$`),
  new RegExp(`^${KINDS} map mods?$`)
]
const MIN_QUERY = 4
const MOD_WORDS = /\b(?:map )?mods?\b/
const MOD_WORDS_ALL = /\b(?:map )?mods?\b/g
const MAX_CARDS = 3
const MAX_ROWS = 12

const tiers = (m: MapBonusMod) => m.t.map(t => TIER_LABEL[t]).join(', ')

function actions (ctx: LookupContext): LookupAction[] {
  const out: LookupAction[] = []
  if (ctx.tools.has(MAP_MODS_TYPE)) out.push({ label: 'Open Map mods', tool: MAP_MODS_TYPE })
  out.push({ label: 'Source: poedb', url: SOURCE })
  return out
}

function bonusCard (data: MapBonusData, kind: MoreKind, ctx: LookupContext): LookupCard | null {
  const mods = data.mods.filter(m => (m.m?.[kind] ?? 0) > 0).sort((a, b) => b.m![kind]! - a.m![kind]! || a.n.localeCompare(b.n))
  if (!mods.length) return null
  return {
    id: `map-bonus:${kind}`,
    group: 'Atlas',
    name: `Map mods with more ${MORE_LABEL[kind]}`,
    sub: `${mods.length} mods, best ${mods[0].n} +${mods[0].m![kind]}%`,
    icon: 'fas fa-map',
    sections: [{
      table: {
        head: ['Mod', `More ${MORE_LABEL[kind]}`],
        rows: mods.slice(0, MAX_ROWS * 2).map(m => ({
          cells: [{ text: `${m.n} (${tiers(m)})`, sub: m.lines.join(' · ') }, `+${m.m![kind]}%`]
        }))
      }
    }, { text: ['Only T17 mods give a more-X bonus. Every map mod also adds Atlas Drops, rarity and pack size.'] }],
    actions: actions(ctx)
  }
}

function modCard (id: string, title: string, mods: MapBonusMod[], ctx: LookupContext): LookupCard {
  const sections: LookupSection[] = mods.slice(0, MAX_ROWS).map(m => ({
    label: `${m.n} · ${tiers(m)}`,
    text: [...m.lines, bonusWords(m)]
  }))
  return {
    id,
    group: 'Atlas',
    name: title,
    sub: mods.length === 1 ? bonusWords(mods[0]) : `${mods.length} versions`,
    icon: 'fas fa-map',
    sections,
    actions: actions(ctx)
  }
}

export function mapBonusLookup (data: MapBonusData | null): Lookup {
  return (query: string, ctx: LookupContext) => {
    if (!data) return []
    const q = query.trim().toLowerCase().replace(/\s+/g, ' ')
    if (q.length < MIN_QUERY) return []
    const bonus = BONUS_QUERY.map(re => q.match(re)).find(Boolean)
    if (bonus && MORE_WORDS[bonus[1]]) {
      const card = bonusCard(data, MORE_WORDS[bonus[1]], ctx)
      return card ? [card] : []
    }
    // "map mod", "mods" and the like ask for map mods; without one, only an
    // affix's exact name does, so ordinary searches ("chaos", "power") stay clean.
    const asked = MOD_WORDS.test(q)
    const rest = q.replace(MOD_WORDS_ALL, ' ').replace(/\s+/g, ' ').trim()
    if (rest.length < 3) return []
    // By affix name: one card per name, every tier's version on it.
    const byName = new Map<string, MapBonusMod[]>()
    for (const m of data.mods) {
      const rank = matchRank(m.n, rest)
      if (asked ? rank < 0 || rank > 1 : m.n.toLowerCase() !== rest) continue
      const list = byName.get(m.n)
      if (list) list.push(m)
      else byName.set(m.n, [m])
    }
    if (byName.size) {
      return [...byName].slice(0, MAX_CARDS).map(([name, mods]) => modCard(`map-bonus:name:${name}`, `Map mod: ${name}`, mods, ctx))
    }
    // By the mod's text.
    if (!asked) return []
    const hits = data.mods.filter(m => m.lines.some(l => l.toLowerCase().includes(rest)))
    return hits.length ? [modCard(`map-bonus:text:${rest}`, `Map mods with "${rest}"`, hits, ctx)] : []
  }
}
