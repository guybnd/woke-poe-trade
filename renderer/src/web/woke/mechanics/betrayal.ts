// Immortal Syndicate safehouse rewards for the current league, checked
// against Exile-UI's betrayal data (data/english/Betrayal.json, July 2026).
// The 3.24 sheet APT ships (renderer/public/images/syndicate.jpg) is out of
// date. Users can override any slot's text in the widget, so a patch change
// does not need a release.

import type { PriceItem } from '../market/types'
import { priceGroup } from './data'
import { isThin } from '../market/types'
import type { PriceGroup } from './data'

export const DIVISIONS = ['Transportation', 'Fortification', 'Research', 'Intervention'] as const

export const MEMBERS = [
  'Aisling', 'Cameria', 'Elreon', 'Gravicius', 'Guff', 'Haku', 'Hillock', 'It That Fled',
  'Janus', 'Jorgin', 'Korell', 'Leo', 'Riker', 'Rin', 'Tora', 'Vagan', 'Vorici'
] as const

// [Transportation, Fortification, Research, Intervention]
export const REWARDS: Record<string, [string, string, string, string]> = {
  'Aisling': ['Double-veiled items', 'Crafting bench: veiled exalt', 'Crafting bench: veiled chaos', 'Torment Scarabs'],
  'Cameria': ['Abyss Scarabs', 'Trapped chest: jewels', 'Crafting bench: jewel', 'Delirium Scarabs'],
  'Elreon': ['Map fragments', 'Trapped chest: Vaal gear', 'Crafting bench: tainted orbs', 'Beyond Scarabs'],
  'Gravicius': ['Stack of divination cards', 'Trapped chest: divination cards', 'Swap a divination card for a random one', 'Divination Scarabs'],
  'Guff': ['Miscellaneous currency', 'Trapped chest: rare gear', 'Crafting bench: reflecting mist', 'Blight Scarabs'],
  'Haku': ['Unique strongbox', 'Domination Scarabs', 'Crafting bench: influence', 'Ambush Scarabs'],
  'Hillock': ['Trapped chest: influenced gear', 'Crafting bench: influenced gear', 'Crafting bench: eldritch implicit', 'Influencing Scarabs'],
  'It That Fled': ['Trapped chest: Foulborn uniques', 'Crafting bench: Breach ring', 'Crafting bench: tainted sockets', 'Breach Scarabs'],
  'Janus': ['Gold piles', 'Kalguuran Scarabs', 'Unique vendor (gold prices)', 'Expedition Scarabs'],
  'Jorgin': ['Sulphite Scarabs', 'Trapped chest: Delve gear', 'Crafting bench: talisman', 'Bestiary Scarabs'],
  'Korell': ['Anarchy Scarabs', 'Crafting bench: essence gear', 'Crafting bench: essences', 'Essence Scarabs'],
  'Leo': ['Incursion Scarabs', 'Trapped chest: Vaal unique', 'Crafting bench: Djinn Vaal Orb', 'Ultimatum Scarabs'],
  'Riker': ['Unique items', 'Trapped chest: unique item', 'Crafting bench: Ancient Orb', 'Titanic Scarabs'],
  'Rin': ['Originator maps', 'Trapped chest: unique map', 'Trapped chest: scarabs', 'Cartography Scarabs'],
  'Tora': ['Quality gems or experience lens', 'Trapped chest: gem', 'Crafting bench: gem', 'Ritual Scarabs'],
  'Vagan': ['Trarthan Scarabs', 'Trapped chest: Enshrouded uniques', 'Crafting bench: Chaos Orb and fracture', 'Legion Scarabs'],
  'Vorici': ['Currency stack', "Crafting bench: jeweller's, chromatic or fusing", 'Crafting bench: chance and scour', 'Harvest Scarabs']
}

// How to price a reward: the best poe.ninja item that matches.
function pricing (reward: string): PriceGroup | null {
  const scarab = /^(\w+) Scarabs$/.exec(reward)
  if (scarab) return { label: reward, types: ['Scarab'], match: new RegExp(`\\b${scarab[1]}\\b`) }
  switch (reward) {
    case 'Fossils': return { label: reward, types: ['Fossil'] }
    case 'Essences': return { label: reward, types: ['Essence'] }
    case 'Catalysts': return { label: reward, types: ['Currency'], match: /Catalyst$/ }
    case 'Orb of Unmaking': return { label: reward, types: ['Currency'], match: /^Orb of Unmaking$/ }
    case 'Breach splinters': return { label: reward, types: ['Fragment'], match: /^Splinter of / }
    case 'Legion splinters': return { label: reward, types: ['Fragment'], match: /^Timeless .*Splinter$/ }
    case 'Expedition currency': return { label: reward, types: ['Artifact'] }
    case 'Map fragments': return { label: reward, types: ['Fragment'] }
    default: return null
  }
}

export interface PricedReward {
  // Best matching item and its price, if poe.ninja has one.
  bestName?: string
  // Typical value (median of the possible items).
  chaos?: number
  // Most valuable possible item.
  upTo?: number
  count?: number
}

// A reward like "Fossils" gives one of many items, so it's worth what the
// typical one sells for (median, thin markets left out), not the best one.
// The best is kept as an "up to".
export function priceReward (reward: string, items: PriceItem[]): PricedReward {
  const group = pricing(reward)
  if (!group) return {}
  const rows = priceGroup({ ...group, limit: 500 }, items)
  if (!rows.length) return {}
  const solid = rows.filter(r => !isThin(r.item))
  const pool = (solid.length ? solid : rows).map(r => r.chaos).sort((a, b) => a - b)
  const mid = pool.length >> 1
  const median = pool.length % 2 ? pool[mid] : (pool[mid - 1] + pool[mid]) / 2
  return { bestName: rows[0].item.name, upTo: rows[0].chaos, chaos: median, count: rows.length }
}

export function slotKey (member: string, division: number): string {
  return `${member}|${division}`
}

// ---- Goals: starred slots, and what to do with whoever you meet ----

export interface BetrayalGoal { member: string, di: number }

export function goalsFromStars (stars: string[]): BetrayalGoal[] {
  const out: BetrayalGoal[] = []
  for (const key of stars) {
    const [member, di] = key.split('|')
    const n = Number(di)
    if (member && Number.isInteger(n) && !out.some(g => g.member === member)) out.push({ member, di: n })
  }
  return out
}

export type AdviceKind = 'move' | 'keep' | 'execute' | 'any'

export interface Advice { kind: AdviceKind, text: string }

// `at`: where each member is now (division index), as the player last set it.
export function adviceFor (member: string, goals: BetrayalGoal[], at: Record<string, number>): Advice {
  const goal = goals.find(g => g.member === member)
  const now = at[member]
  if (goal) {
    if (now === goal.di) return { kind: 'keep', text: 'Keep: pick the option that raises their rank, otherwise Interrogate.' }
    return { kind: 'move', text: `Move: pick the option that sends them to ${DIVISIONS[goal.di]}, otherwise Interrogate.` }
  }
  if (now != null) {
    const blocked = goals.find(g => g.di === now && at[g.member] !== g.di)
    if (blocked) return { kind: 'execute', text: `Execute: frees a ${DIVISIONS[now]} slot for ${blocked.member}.` }
  }
  return { kind: 'any', text: 'Not part of a goal: Interrogate, or take whatever pays most now.' }
}
