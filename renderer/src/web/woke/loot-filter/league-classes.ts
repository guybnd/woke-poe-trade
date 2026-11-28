// League items on the Loot tab (Guy's League A, 2026-11-27): one class, a
// section per mechanic. poe.ninja prices almost none of these (contracts,
// blueprints, logbooks, tomes), so a section is on (NeverSink's rules) or
// Off: a mechanic you don't run goes away in maps in one click.
import type { FilterCondition } from './parse'
import type { LootCategory } from './fragment-classes'
import type { SectionMode } from './currency-settings'

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
  { id: 'lgmerc', name: 'Mercenary warrants', art: 'Mercenary Warrant' },
  { id: 'lgheistgear', name: 'Heist gear', art: 'Whisper-woven Cloak' },
  { id: 'lgcorpse', name: 'Corpses', art: 'Perfect Forest Tiger' },
  { id: 'lgwomb', name: 'Wombgifts', art: 'Ancient Wombgift' }
]
export const LEAGUE_IDS = new Set(LEAGUE_CATEGORIES.map(x => x.id))

// Always by default (Guy, 2026-11-28): one drop a run, from an encounter you
// chose to do, not ground litter, so price only lifts them above Small.
export const LEAGUE_MODES: Record<string, SectionMode> = { lgchron: 'always', lgviscera: 'always', lgkeys: 'always', lgult: 'always', lgmerc: 'always', lgexped: 'always', lgcorpse: 'always' }

export const LEAGUE_LOOK: Record<string, { text: [number, number, number], color: string, shape: string }> = {
  lgexped: { text: [220, 170, 120], color: 'Orange', shape: 'Pentagon' },
  lgheist: { text: [230, 150, 110], color: 'Brown', shape: 'Pentagon' },
  lgchron: { text: [150, 210, 120], color: 'Green', shape: 'Pentagon' },
  lgviscera: { text: [210, 140, 150], color: 'Pink', shape: 'Pentagon' },
  lgkeys: { text: [200, 190, 240], color: 'Purple', shape: 'Pentagon' },
  lgult: { text: [235, 200, 120], color: 'Yellow', shape: 'Pentagon' },
  lgsanctum: { text: [140, 200, 230], color: 'Cyan', shape: 'Pentagon' },
  lgcharts: { text: [170, 200, 255], color: 'Blue', shape: 'Pentagon' },
  lgmerc: { text: [235, 235, 235], color: 'White', shape: 'Pentagon' },
  lgheistgear: { text: [200, 160, 130], color: 'Brown', shape: 'Pentagon' },
  lgcorpse: { text: [190, 210, 180], color: 'Grey', shape: 'Pentagon' },
  lgwomb: { text: [249, 150, 25], color: 'Orange', shape: 'Pentagon' }
}

const JOBS = ['Bunker', 'Laboratory', 'Mansion', 'Prohibited Library', 'Records Office', 'Repository', "Smuggler's Den", 'Tunnels', 'Underbelly']
const NOT_UNIQUE = cond('Rarity', '', ['Normal', 'Magic', 'Rare'])
const ENCHANTED = cond('AnyEnchantment', '', ['True'])
const ilvl = (op: string, n: number) => cond('ItemLevel', op, [String(n)])
const HEIST_GEAR = [
  { name: 'Heist cloak', cls: 'Heist Cloaks', tip: 'Whisper-woven Cloak' },
  { name: 'Heist brooch', cls: 'Heist Brooches', tip: 'Foliate Brooch' },
  { name: 'Heist gear', cls: 'Heist Gear', tip: 'Precise Arrowhead' },
  { name: 'Heist tool', cls: 'Heist Tools', tip: 'Master Lockpick' }
]

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
  { cat: 'lgmerc', name: 'Mercenary Warrant', cls: '', bts: ['Mercenary Warrant'], guess: 1.5, conds: [] },
  // Unique contracts and blueprints (the Heist reward chests' own).
  { cat: 'lgheist', name: 'Unique contract or blueprint', cls: 'Contracts|Blueprints', bts: [], tip: 'Contract: Bunker', guess: 5, conds: [cond('Rarity', '', ['Unique'])] },
  // Rogue gear (NeverSink retirement M4a): poe.ninja prices none of it, and
  // it's worth crafting on only at item level 83+, where the top mods roll.
  ...HEIST_GEAR.flatMap(g => [
    { cat: 'lgheistgear', name: `${g.name}, item level 83+`, cls: g.cls, bts: [], tip: g.tip, guess: 1.5, conds: [NOT_UNIQUE, ilvl('>=', 83)] },
    { cat: 'lgheistgear', name: `${g.name}, item level under 83`, cls: g.cls, bts: [], tip: g.tip, guess: 0.4, conds: [NOT_UNIQUE, ilvl('<', 83)] }
  ])
]

// Corpses (NeverSink retirement M4a): priced by name on poe.ninja's Corpse
// page; the names from the game data's lists, else the filter's. A guess by
// its grade while poe.ninja has no line.
// Wombgifts (Guy 2026-11-28): priced by name on poe.ninja's Wombgift page
// (its cheapest item level band), else a guess. The game data's list wins
// over this one.
export const WOMBGIFTS = ['Mysterious Wombgift', 'Lavish Wombgift', 'Provisioning Wombgift', 'Ancient Wombgift']
export function wombgiftGuess (name: string): number {
  return /^Ancient /.test(name) ? 3 : 1
}

export function corpseGuess (name: string): number {
  return /^Perfect /.test(name) ? 5 : /^Imperfect /.test(name) ? 0.3 : 1
}

// The priced sections: NeverSink's lists of their bases, priced by name.
// Chronicles poe.ninja lists by rooms, which a filter can't see: the cheapest
// line stands for them.
export const LEAGUE_PRICED: Array<{ cat: string, cls: string, type: string, tiers: string[], ninja: string[], guess: (tier: string | null) => number }> = [
  { cat: 'lgviscera', cls: 'Viscera', type: 'viscera', tiers: ['t1', 't2', 't3', 't4', 't5'], ninja: ['Viscera'], guess: t => t === 't1' ? 60 : t === 't2' ? 10 : t === 't3' ? 3 : 0.5 },
  { cat: 'lgkeys', cls: '', type: 'miscmapitemsextra', tiers: ['relickeys'], ninja: ['Fragment'], guess: () => 3 }
]
// poe.ninja lists each Chronicle by one room it has (its IncursionTemple
// page). A drop has random rooms, so it's worth at least the cheapest solid
// line (Guy's price audit, 2026-11-28: the name alone never matched, so the
// row sat at its 3c guess while the cheapest temple sold for 50c).
export const TEMPLE_ROOMS = [
  'Anomaly Research Lab (Tier 1)',
  'Antechamber',
  'Apex of Ascension (Tier 3)',
  'Apex of Atzoatl',
  'Arena of Valour (Tier 2)',
  "Armourer's Workshop (Tier 1)",
  'Armoury (Tier 2)',
  'Atlas of Worlds (Tier 3)',
  'Automaton Lab (Tier 2)',
  'Banquet Hall',
  'Barracks (Tier 2)',
  'Breach Containment Chamber (Tier 2)',
  'Catalyst of Corruption (Tier 2)',
  'Cellar',
  'Chamber of Iron (Tier 3)',
  'Chasm',
  'Cloister',
  'Conduit of Lightning (Tier 3)',
  'Corruption Chamber (Tier 1)',
  'Court of Sealed Death (Tier 3)',
  'Cradle of Creation (Tier 3)',
  'Crucible of Flame (Tier 3)',
  'Cultivar Chamber (Tier 2)',
  'Defense Research Lab (Tier 3)',
  'Demolition Lab (Tier 2)',
  'Department of Thaumaturgy (Tier 2)',
  "Doryani's Institute (Tier 3)",
  'Engineering Department (Tier 2)',
  'Explosives Room (Tier 1)',
  'Factory (Tier 3)',
  'Flame Workshop (Tier 1)',
  "Gemcutter's Workshop (Tier 1)",
  'Glittering Halls (Tier 3)',
  'Grand Reactor (Tier 2)',
  'Guardhouse (Tier 1)',
  'Hall of Champions (Tier 3)',
  'Hall of Heroes (Tier 2)',
  'Hall of Legends (Tier 3)',
  'Hall of Locks (Tier 2)',
  'Hall of Mettle (Tier 1)',
  'Hall of Offerings (Tier 2)',
  'Hall of War (Tier 3)',
  'Halls',
  'Hatchery (Tier 1)',
  'House of the Others (Tier 3)',
  'Hurricane Engine (Tier 2)',
  'Hybridisation Chamber (Tier 3)',
  "Jeweller's Workshop (Tier 1)",
  'Jewellery Forge (Tier 2)',
  'Lightning Workshop (Tier 1)',
  'Locus of Corruption (Tier 3)',
  'Museum of Artefacts (Tier 3)',
  'Office of Cartography (Tier 2)',
  'Passageways',
  'Pits',
  'Poison Garden (Tier 1)',
  'Pools of Restoration (Tier 1)',
  'Royal Forge (Tier 2)',
  'Sacrificial Chamber (Tier 1)',
  "Sadist's Den (Tier 3)",
  'Sanctum of Immortality (Tier 3)',
  'Sanctum of Unity (Tier 2)',
  'Sanctum of Vitality (Tier 2)',
  'Shrine of Empowerment (Tier 1)',
  'Shrine of Unmaking (Tier 3)',
  'Sparring Room (Tier 1)',
  'Storage Room (Tier 1)',
  'Storm of Corruption (Tier 3)',
  'Strongbox Chamber (Tier 1)',
  "Surveyor's Study (Tier 1)",
  'Tempest Generator (Tier 1)',
  'Temple Defense Workshop (Tier 2)',
  'Temple Nexus (Tier 3)',
  'Tombs',
  'Torment Cells (Tier 1)',
  'Torture Cages (Tier 2)',
  'Toxic Grove (Tier 3)',
  'Trap Workshop (Tier 1)',
  'Treasury (Tier 2)',
  'Tunnels',
  'Vault (Tier 1)',
  'Warehouses (Tier 2)',
  'Wealth of the Vaal (Tier 3)',
  'Workshop (Tier 1)'
]
export const CHRONICLE = { cat: 'lgchron', name: 'Chronicle of Atzoatl', ninja: ['IncursionTemple'], guess: 3, rooms: TEMPLE_ROOMS }
