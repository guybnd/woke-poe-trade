// Life and mana flasks and tinctures on the Loot tab (NeverSink retirement
// M4a, 2026-11-28). Utility flasks score on Equipment › Flasks; these are
// the ones worth picking up in maps for crafting: the top bases with
// quality over 20% (only a corrupted or Harvest flask gets there) or a high
// item level, where the top mods roll. poe.ninja prices none of them, so
// each row starts from a guess on the same steps, and you set its step or
// price. Rows never overlap. Below area level 68 the levelling rules decide.
import type { LootCategory } from './fragment-classes'
import type { FilterCondition } from './parse'

export const FLASK_CATEGORIES: LootCategory[] = [
  { id: 'flasklife', name: 'Life and mana flasks', art: 'Divine Life Flask' },
  { id: 'flasktinc', name: 'Tinctures', art: 'Oakbranch Tincture' }
]
export const FLASK_IDS = new Set(FLASK_CATEGORIES.map(x => x.id))

// The flask red and the tincture green; Moon on the minimap (gear is
// Hexagon, utility flasks score with the gear).
export const FLASK_LOOK: Record<string, { text: [number, number, number], color: string, shape: string }> = {
  flasklife: { text: [235, 120, 120], color: 'Pink', shape: 'Moon' },
  flasktinc: { text: [150, 220, 140], color: 'Green', shape: 'Moon' }
}

// NeverSink's endgame flask and tincture rules; ours go above the first.
export const FLASK_RULE_TYPE = /^endgame(flasks|tinctures)$/

// The top life, mana and hybrid bases: the ones that drop from level 60
// (base-facts.ts; flask-classes.test checks the list against it).
export const TOP_LIFE_MANA = ['Divine Life Flask', 'Divine Mana Flask', 'Eternal Life Flask', 'Eternal Mana Flask', 'Hallowed Hybrid Flask']

export interface FlaskRow {
  cat: string
  // Unique among every Loot tab item: your edits are kept by name.
  name: string
  cls: string
  bts: string[]
  // The base its tooltip shows.
  tip: string
  guess: number
  conds: FilterCondition[]
}

const cnd = (key: string, op: string, values: string[]): FilterCondition => ({ key, op, count: null, values } as FilterCondition)
const PLAIN = [cnd('Mirrored', '', ['False']), cnd('Corrupted', '', ['False']), cnd('Rarity', '', ['Normal', 'Magic'])]
// A magic one is left to its mods (Equipment's identified rules).
const WHITE = [cnd('Mirrored', '', ['False']), cnd('Corrupted', '', ['False']), cnd('Rarity', '', ['Normal'])]
const q = (op: string, n: number) => cnd('Quality', op, [String(n)])
const ilvl = (op: string, n: number) => cnd('ItemLevel', op, [String(n)])
const LIFE_CLS = 'Life Flasks|Mana Flasks|Hybrid Flasks'

// Guesses at the default steps: 20 Big, 5 Decent, 1.5 Normal, 0.4 Small;
// 0.1 hides.
export const FLASK_ROWS: FlaskRow[] = [
  { cat: 'flasklife', name: 'Top life or mana flask, quality 30%', cls: LIFE_CLS, bts: TOP_LIFE_MANA, tip: 'Divine Life Flask', guess: 5, conds: [...PLAIN, q('>=', 30), ilvl('>=', 82)] },
  { cat: 'flasklife', name: 'Top life or mana flask, quality 21-29%', cls: LIFE_CLS, bts: TOP_LIFE_MANA, tip: 'Divine Life Flask', guess: 1.5, conds: [...PLAIN, q('>=', 21), q('<=', 29), ilvl('>=', 82)] },
  { cat: 'flasklife', name: 'White top life or mana flask, item level 82+', cls: LIFE_CLS, bts: TOP_LIFE_MANA, tip: 'Eternal Life Flask', guess: 0.1, conds: [...WHITE, q('<=', 20), ilvl('>=', 82)] },
  { cat: 'flasktinc', name: 'Tincture, quality 26%+', cls: 'Tinctures', bts: [], tip: 'Oakbranch Tincture', guess: 20, conds: [...PLAIN, q('>=', 26), ilvl('>=', 82)] },
  { cat: 'flasktinc', name: 'Tincture, quality 21-25%', cls: 'Tinctures', bts: [], tip: 'Oakbranch Tincture', guess: 5, conds: [...PLAIN, q('>=', 21), q('<=', 25), ilvl('>=', 82)] },
  { cat: 'flasktinc', name: 'Tincture, item level 85+', cls: 'Tinctures', bts: [], tip: 'Rosethorn Tincture', guess: 1.5, conds: [...PLAIN, q('<=', 20), ilvl('>=', 85)] },
  { cat: 'flasktinc', name: 'Tincture, item level 82-84', cls: 'Tinctures', bts: [], tip: 'Ashbark Tincture', guess: 0.4, conds: [...PLAIN, q('<=', 20), ilvl('>=', 82), ilvl('<=', 84)] }
]
