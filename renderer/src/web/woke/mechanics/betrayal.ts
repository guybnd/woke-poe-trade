// Immortal Syndicate safehouse rewards for the current league, checked
// against Exile-UI's betrayal data (data/english/Betrayal.json, 2026-11-12,
// 3.30) and the 3.30 patch notes: scarabs are gone, Intervention gives a
// trapped chest of one class of uniques, the old scarab chests give one
// Allflame Ember, and Rin's Fortification and Research give Threads.
// The 3.24 sheet APT ships (renderer/public/images/syndicate.jpg) is out of
// date. Users can override any slot's text in the widget, so a patch change
// does not need a release.

import type { PriceItem } from '../market/types'
import { priceGroup } from './data'
import { isThin } from '../market/types'
import type { PriceGroup } from './data'

export const DIVISIONS = ['Transportation', 'Fortification', 'Research', 'Intervention'] as const
export type Division = typeof DIVISIONS[number]

export const MEMBERS = [
  'Aisling', 'Cameria', 'Elreon', 'Gravicius', 'Guff', 'Haku', 'Hillock', 'It That Fled',
  'Janus', 'Jorgin', 'Korell', 'Leo', 'Riker', 'Rin', 'Tora', 'Vagan', 'Vorici'
] as const

// [Transportation, Fortification, Research, Intervention]
export const REWARDS: Record<string, [string, string, string, string]> = {
  'Aisling': ['Double-veiled items', 'Crafting bench: veiled exalt', 'Crafting bench: veiled chaos', 'Trapped chest: unique gloves'],
  'Cameria': ['Embers of Toads', 'Trapped chest: jewels', 'Crafting bench: jewel', 'Trapped chest: unique axes'],
  'Elreon': ['Embers of the Divine', 'Trapped chest: Vaal gear', 'Crafting bench: tainted orbs', 'Trapped chest: unique staves'],
  'Gravicius': ['Stack of divination cards', 'Trapped chest: divination cards', 'Swap a divination card for a random one', 'Trapped chest: unique sceptres and wands'],
  'Guff': ['Miscellaneous currency', 'Trapped chest: rare gear', 'Crafting bench: reflecting mist', 'Trapped chest: unique shields'],
  'Haku': ['Unique strongbox', 'Embers of Flesh', 'Crafting bench: influence', 'Trapped chest: unique maces'],
  'Hillock': ['Trapped chest: influenced gear', 'Crafting bench: influenced gear', 'Crafting bench: eldritch implicit', 'Trapped chest: unique body armours'],
  'It That Fled': ['Trapped chest: Foulborn uniques', 'Crafting bench: Breach ring', 'Crafting bench: tainted sockets', 'Trapped chest: unique amulets'],
  'Janus': ['Gold piles', 'Embers of the Gilded', 'Unique vendor (gold prices)', 'Trapped chest: unique rings'],
  'Jorgin': ['Embers of Resplendence', 'Trapped chest: Delve gear', 'Crafting bench: talisman', 'Trapped chest: unique belts'],
  'Korell': ['Embers of the Cloister', 'Crafting bench: essence gear', 'Crafting bench: essences', 'Trapped chest: unique boots'],
  'Leo': ['Embers of the Multitude', 'Trapped chest: Vaal unique', 'Crafting bench: Djinn Vaal Orb', 'Trapped chest: unique helmets'],
  'Riker': ['Unique items', 'Ancient Orbs', 'Crafting bench: Ancient Orb', 'Trapped chest: unique items'],
  'Rin': ['Originator maps', 'Threads', 'Trapped chest: Threads', 'Trapped chest: unique maps'],
  'Tora': ['Quality gems or experience lens', 'Trapped chest: gem', 'Crafting bench: gem', 'Trapped chest: unique bows'],
  'Vagan': ['Embers of the Wildwood', 'Trapped chest: Enshrouded uniques', 'Crafting bench: Chaos Orb and fracture', 'Trapped chest: unique swords'],
  'Vorici': ['Currency stack', "Crafting bench: jeweller's, chromatic or fusing", 'Trapped chest: Soul Core quality gems', 'Trapped chest: unique daggers and claws']
}

// How to price a reward: the best poe.ninja item that matches.
function pricing (reward: string): PriceGroup | null {
  // "Embers of the Divine": Allflame Ember of the Divine.
  const ember = /^Embers of ((the )?\w+)$/.exec(reward)
  if (ember) return { label: reward, types: ['AllflameEmber'], match: new RegExp(`^Allflame Ember of ${ember[1]}$`) }
  switch (reward) {
    // A Frayed Thread opens into a random Thread: not one itself.
    case 'Threads':
    case 'Trapped chest: Threads': return { label: reward, types: ['Thread', 'Fragment'], match: /^(?!Frayed )\S+ Thread$/ }
    case 'Ancient Orbs': return { label: reward, types: ['Currency'], match: /^Ancient Orb$/ }
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
