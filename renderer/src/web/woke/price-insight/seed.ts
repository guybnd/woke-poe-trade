// The price check's list of valuable mods: which mods its price drivers test
// first, and (Guy's pick W1, 2026-11-28) which mods score identified gear in
// the loot filter's Rare weights. Kept apart from drivers.ts so the loot
// filter reads it without the trade search code.
import { shallowRef, watch } from 'vue'

// Matched case-insensitively as a substring of the stat's reference text,
// where numbers are written as '#' (e.g. '+# to maximum Life').
export const DEFAULT_SEED = [
  '+# to Level of all',
  'to Level of Socketed',
  'increased Movement Speed',
  // A rare's life usually reaches the search as its total.
  'total maximum Life',
  'to maximum Life',
  'total maximum Energy Shield',
  'to maximum Energy Shield',
  'increased maximum Energy Shield',
  'to all Elemental Resistances',
  'Resistance',
  'increased Spell Damage',
  'Critical Strike Multiplier',
  'increased Critical Strike Chance',
  'increased Attack Speed',
  'increased Cast Speed',
  'increased Physical Damage',
  'Adds # to # Physical Damage',
  'to Strength',
  'to Dexterity',
  'to Intelligence',
  'to all Attributes',
  'Suppress Spell Damage',
  'to Accuracy Rating'
]

export const SEED_KEY = 'woke.priceDriverSeed'

export function readSeed (): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SEED_KEY) ?? 'null')
    if (Array.isArray(v) && v.every(s => typeof s === 'string')) return v
  } catch {}
  return DEFAULT_SEED
}

export const driverSeed = shallowRef<string[]>(readSeed())
watch(driverSeed, (v) => {
  try { localStorage.setItem(SEED_KEY, JSON.stringify(v)) } catch {}
})
