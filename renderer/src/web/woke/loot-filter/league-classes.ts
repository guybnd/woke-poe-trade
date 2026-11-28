// League items on the Loot tab (Guy's League A, 2026-11-27): one class, a
// section per mechanic. poe.ninja prices almost none of these (contracts,
// blueprints, logbooks, tomes), so a section is on (NeverSink's rules) or
// Off: a mechanic you don't run goes away in maps in one click.
import type { FilterCondition } from './parse'
import type { LootCategory } from './fragment-classes'

const cond = (key: string, op: string, values: string[]): FilterCondition => ({ key, op, count: null, values } as FilterCondition)

export interface LeagueSection { id: string, name: string, conds: FilterCondition[] }
export const LEAGUE_SECTIONS: LeagueSection[] = [
  { id: 'lgheist', name: 'Heist contracts and blueprints', conds: [cond('Class', '==', ['Contracts', 'Blueprints'])] },
  { id: 'lgexped', name: 'Expedition logbooks', conds: [cond('BaseType', '==', ['Expedition Logbook'])] },
  { id: 'lgsanctum', name: 'Sanctum research', conds: [cond('Class', '==', ['Sanctum Research'])] },
  { id: 'lgkeys', name: 'Reliquary keys', conds: [cond('Class', '==', ['Vault Keys'])] },
  { id: 'lgcharts', name: 'Charts', conds: [cond('Class', '==', ['Chart'])] },
  { id: 'lgviscera', name: 'Viscera', conds: [cond('Class', '==', ['Viscera'])] },
  { id: 'lgchron', name: 'Chronicles of Atzoatl', conds: [cond('BaseType', '==', ['Chronicle of Atzoatl'])] },
  { id: 'lgult', name: 'Inscribed Ultimatums', conds: [cond('BaseType', '==', ['Inscribed Ultimatum'])] },
  { id: 'lgmerc', name: 'Mercenary warrants', conds: [cond('BaseType', '==', ['Mercenary Warrant'])] }
]

// League items as Loot tab folds (Guy's League A, 2026-11-28: "sections like
// currency"). Viscera, Reliquary keys and Chronicles are priced by poe.ninja;
// the rest get a row per thing a filter can see on them (item level,
// enchanted), each a guess near NeverSink's look you set the step or price
// of. The folds keep the sections' ids, so a section set Off stays Off.
export const LEAGUE_CATEGORIES: LootCategory[] = [
  { id: 'lgexped', name: 'Expedition logbooks', art: 'Expedition Logbook' },
  { id: 'lgheist', name: 'Heist contracts and blueprints', art: 'Blueprint: Bunker' },
  { id: 'lgchron', name: 'Chronicles of Atzoatl', art: 'Chronicle of Atzoatl' },
  { id: 'lgviscera', name: 'Viscera', art: "Maven's Orrery" },
  { id: 'lgkeys', name: 'Reliquary keys', art: 'Ancient Reliquary Key' },
  { id: 'lgult', name: 'Inscribed Ultimatums', art: 'Inscribed Ultimatum' },
  { id: 'lgsanctum', name: 'Sanctum research', art: 'Forbidden Tome' },
  { id: 'lgcharts', name: 'Charts', art: 'Coral Reef Chart' },
  { id: 'lgmerc', name: 'Mercenary warrants', art: 'Mercenary Warrant' }
]
export const LEAGUE_IDS = new Set(LEAGUE_CATEGORIES.map(x => x.id))

export const LEAGUE_LOOK: Record<string, { text: [number, number, number], color: string, shape: string }> = {
  lgexped: { text: [220, 170, 120], color: 'Orange', shape: 'Kite' },
  lgheist: { text: [230, 150, 110], color: 'Brown', shape: 'Kite' },
  lgchron: { text: [150, 210, 120], color: 'Green', shape: 'Kite' },
  lgviscera: { text: [210, 140, 150], color: 'Pink', shape: 'Kite' },
  lgkeys: { text: [200, 190, 240], color: 'Purple', shape: 'Kite' },
  lgult: { text: [235, 200, 120], color: 'Yellow', shape: 'Kite' },
  lgsanctum: { text: [140, 200, 230], color: 'Cyan', shape: 'Kite' },
  lgcharts: { text: [170, 200, 255], color: 'Blue', shape: 'Kite' },
  lgmerc: { text: [235, 235, 235], color: 'White', shape: 'Kite' }
}

const JOBS = ['Bunker', 'Laboratory', 'Mansion', 'Prohibited Library', 'Records Office', 'Repository', "Smuggler's Den", 'Tunnels', 'Underbelly']
const NOT_UNIQUE = cond('Rarity', '', ['Normal', 'Magic', 'Rare'])
const ENCHANTED = cond('AnyEnchantment', '', ['True'])
const ilvl = (op: string, n: number) => cond('ItemLevel', op, [String(n)])

export interface LeagueRow {
  cat: string
  // Unique among every Loot tab item: your edits are kept by name.
  name: string
  // The filter's Class ('' for none) and BaseTypes ([] for any of the class).
  cls: string
  bts: string[]
  // The base its tooltip shows.
  tip?: string
  guess: number
  conds: FilterCondition[]
}

// Guesses at the default steps: 20 Big, 5 Decent, 1.5 Normal, 0.4 Small.
export const LEAGUE_ROWS: LeagueRow[] = [
  { cat: 'lgexped', name: 'Logbook, item level 83+', cls: '', bts: ['Expedition Logbook'], guess: 5, conds: [ilvl('>=', 83)] },
  { cat: 'lgexped', name: 'Logbook, item level under 83', cls: '', bts: ['Expedition Logbook'], guess: 1.5, conds: [ilvl('<', 83)] },
  { cat: 'lgheist', name: 'Blueprint, enchanted', cls: 'Blueprints', bts: JOBS.map(j => `Blueprint: ${j}`), guess: 20, conds: [NOT_UNIQUE, ENCHANTED] },
  { cat: 'lgheist', name: 'Blueprint, item level 83+', cls: 'Blueprints', bts: JOBS.map(j => `Blueprint: ${j}`), guess: 5, conds: [NOT_UNIQUE, ilvl('>=', 83)] },
  { cat: 'lgheist', name: 'Blueprint, item level under 83', cls: 'Blueprints', bts: JOBS.map(j => `Blueprint: ${j}`), guess: 1.5, conds: [NOT_UNIQUE, ilvl('<', 83)] },
  { cat: 'lgheist', name: 'Contract, enchanted', cls: 'Contracts', bts: JOBS.map(j => `Contract: ${j}`), guess: 5, conds: [NOT_UNIQUE, ENCHANTED] },
  { cat: 'lgheist', name: 'Contract, item level 83+', cls: 'Contracts', bts: JOBS.map(j => `Contract: ${j}`), guess: 1.5, conds: [NOT_UNIQUE, ilvl('>=', 83)] },
  { cat: 'lgheist', name: 'Contract, item level under 83', cls: 'Contracts', bts: JOBS.map(j => `Contract: ${j}`), guess: 0.4, conds: [NOT_UNIQUE, ilvl('<', 83)] },
  { cat: 'lgult', name: 'Inscribed Ultimatum', cls: '', bts: ['Inscribed Ultimatum'], guess: 1.5, conds: [] },
  { cat: 'lgsanctum', name: 'Sanctum research, item level 83+', cls: 'Sanctum Research', bts: [], tip: 'Forbidden Tome', guess: 1.5, conds: [ilvl('>=', 83)] },
  { cat: 'lgsanctum', name: 'Sanctum research, item level under 83', cls: 'Sanctum Research', bts: [], tip: 'Forbidden Tome', guess: 0.4, conds: [ilvl('<', 83)] },
  { cat: 'lgcharts', name: 'Chart', cls: 'Chart', bts: [], tip: 'Coral Reef Chart', guess: 1.5, conds: [NOT_UNIQUE] },
  { cat: 'lgmerc', name: 'Mercenary Warrant', cls: '', bts: ['Mercenary Warrant'], guess: 1.5, conds: [] }
]

// The priced sections: NeverSink's lists of their bases, priced by name.
// Chronicles poe.ninja lists by rooms, which a filter can't see: the cheapest
// line stands for them.
export const LEAGUE_PRICED: Array<{ cat: string, cls: string, type: string, tiers: string[], ninja: string[], guess: (tier: string | null) => number }> = [
  { cat: 'lgviscera', cls: 'Viscera', type: 'viscera', tiers: ['t1', 't2', 't3', 't4', 't5'], ninja: ['Viscera'], guess: t => t === 't1' ? 60 : t === 't2' ? 10 : t === 't3' ? 3 : 0.5 },
  { cat: 'lgkeys', cls: '', type: 'miscmapitemsextra', tiers: ['relickeys'], ninja: ['Fragment'], guess: () => 3 }
]
export const CHRONICLE = { cat: 'lgchron', name: 'Chronicle of Atzoatl', ninja: ['IncursionTemple'], guess: 3 }
