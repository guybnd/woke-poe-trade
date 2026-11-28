// Uniques on the Loot tab (Guy's picks, 2026-11-27: Uniques A, bossmix M1;
// 2026-11-28: A, K1, S1, R1). A filter can't tell uniques apart on one base,
// so a base is priced by its average drop: each unique that drops on it
// naturally (boss-only uniques left out) counted by how often it turns up.
// A T0 unique (the rarest) is a chase: the base goes to Chase uniques
// (Always) instead of being priced by it. The bases come from NeverSink's plain unique tiers;
// its special rules (6-link, corrupted implicits, abyss sockets,
// replicas) keep deciding those items, above the priced ones.
import type { LootCategory } from './fragment-classes'
import type { SectionMode } from './currency-settings'

export const UNIQUE_CATEGORIES: LootCategory[] = [
  { id: 'uniqchase', name: 'Chase uniques', art: 'Leather Belt' },
  { id: 'uniqplain', name: 'Uniques', art: 'Sadist Garb' },
  { id: 'uniqvar', name: 'High variance', art: 'Small Cluster Jewel' },
  { id: 'uniqearly', name: 'Early league', art: 'Bone Helmet' },
  { id: 'uniqboss', name: 'Boss and special drops', art: 'Cabalist Regalia' },
  // A boss base that also has uniques dropping anywhere (Guy 2026-11-28: its
  // own section, apart from boss-only): priced by those world drops.
  { id: 'uniqbossmix', name: 'Boss drops, also world drops', art: 'Agate Amulet' },
  { id: 'uniqfoul', name: 'Foulborn', art: 'Paua Amulet' },
  { id: 'uniqspec', name: 'Special rolls', art: 'Simple Robe' }
]
export const UNIQUE_IDS = new Set(UNIQUE_CATEGORIES.map(x => x.id))

// The unique brown, a shade per fold.
export const UNIQUE_LOOK: Record<string, { text: [number, number, number], color: string, shape: string }> = {
  // A base with a rare jackpot on it (Headhunter on Leather Belt): its step
  // from the average drop, plus a gold edge and a Kite icon (Guy's K1).
  uniqchase: { text: [175, 96, 37], color: 'Brown', shape: 'Kite' },
  uniqplain: { text: [175, 96, 37], color: 'Brown', shape: 'Star' },
  uniqvar: { text: [210, 130, 60], color: 'Orange', shape: 'Star' },
  uniqearly: { text: [200, 150, 90], color: 'Yellow', shape: 'Star' },
  // Not red: red beams and map icons are kept for Tink (Guy 2026-11-27).
  uniqboss: { text: [190, 80, 40], color: 'Orange', shape: 'Pentagon' },
  uniqbossmix: { text: [200, 125, 70], color: 'Orange', shape: 'Hexagon' },
  uniqfoul: { text: [190, 110, 200], color: 'Purple', shape: 'Star' },
  uniqspec: { text: [230, 160, 80], color: 'Brown', shape: 'Cross' }
}

// Boss-only bases show whatever they are (Guy: "boss-only likely always on"),
// and so do chase bases (Guy 2026-11-28: "a chase unique section that has
// always on by default").
// The Chase uniques looks (Guy 2026-11-28, picked on the section's header):
// unique brown text and edge on a ground no other look uses, a Kite icon and
// beam in `color`. T1 is the default.
export interface ChaseLook { id: string, name: string, text: number[], edge: number[], bg: number[], color: string }
export const CHASE_LOOKS: ChaseLook[] = [
  { id: 'T1', name: 'Ice blue', text: [175, 96, 37], edge: [175, 96, 37], bg: [215, 232, 255], color: 'Brown' },
  { id: 'T2', name: 'Ice blue, blue edge', text: [175, 96, 37], edge: [70, 120, 200], bg: [215, 232, 255], color: 'Cyan' },
  { id: 'T3', name: 'Steel blue', text: [150, 75, 20], edge: [150, 75, 20], bg: [180, 205, 235], color: 'Brown' },
  { id: 'T4', name: 'Teal', text: [165, 85, 30], edge: [165, 85, 30], bg: [200, 240, 232], color: 'Cyan' },
  { id: 'T5', name: 'Lavender', text: [165, 85, 30], edge: [165, 85, 30], bg: [232, 222, 255], color: 'Purple' },
  { id: 'T6', name: 'Sage', text: [150, 80, 25], edge: [150, 80, 25], bg: [220, 235, 210], color: 'Green' },
  { id: 'C1', name: 'Cream', text: [120, 52, 12], edge: [175, 96, 37], bg: [255, 228, 175], color: 'Yellow' },
  { id: 'C2', name: 'White (T1 unique)', text: [175, 96, 37], edge: [175, 96, 37], bg: [255, 255, 255], color: 'Brown' },
  { id: 'C3', name: 'Brown slab', text: [255, 255, 255], edge: [255, 255, 255], bg: [175, 96, 37], color: 'Orange' },
  { id: 'C4', name: 'Ember', text: [255, 140, 40], edge: [255, 140, 40], bg: [20, 8, 2], color: 'Pink' }
]
export const chaseLookOf = (id?: string) => CHASE_LOOKS.find(l => l.id === id) ?? CHASE_LOOKS[0]

export const UNIQUE_MODES: Record<string, SectionMode> = { uniqboss: 'always', uniqchase: 'always' }

// NeverSink's tiers that list bases by price. Every other unique tier is a
// special rule and stays NeverSink's.
const TIER_CAT: Record<string, string> = {
  t1: 'uniqplain',
  t2: 'uniqplain',
  t3: 'uniqplain',
  hideable: 'uniqplain',
  hideable2: 'uniqplain',
  restex: 'uniqplain',
  multispecialhigh: 'uniqvar',
  multispecial: 'uniqvar',
  earlyleague: 'uniqearly',
  t3boss: 'uniqboss'
}
export const uniqueCategoryOf = (tier: string | null): string | null => tier ? TIER_CAT[tier] ?? null : null

// Foulborn uniques (Guy's R1, 2026-11-28): their own section, priced by the
// most valuable Foulborn unique on the base (poe.ninja's Foulborn lines), on
// the same steps. NeverSink's Foulborn tiers list the bases; a Foulborn
// unique on a base it doesn't list stays NeverSink's (restex).
export const FOULBORN_TYPE = 'uniques->foulborn'
const FOUL_TIERS = new Set(['t1', 't2', 'multi', 't3'])
export const foulCategoryOf = (tier: string | null): string | null => tier && FOUL_TIERS.has(tier) ? 'uniqfoul' : null
const FOUL_GUESS: Record<string, number> = { t1: 300, t2: 50, multi: 10, t3: 2 }
export const foulGuess = (tier: string | null): number => (tier && FOUL_GUESS[tier]) || 1
export const FOULBORN_PREFIX = 'Foulborn '

// NeverSink's special unique rolls above its tiers (Guy's spec A, 2026-11-28):
// priced per base. A fixed outcome (a 6-link Tabula, a socketless Kaom's
// Heart) by its price, a variable one (Impresence with both influences,
// synthesised rings, abyss sockets) by its best line on poe.ninja. A 6-link
// is worth at least the 20 Orbs of Fusing a vendor gives for it. A base
// poe.ninja has nothing for stays NeverSink's.
export const SPECIAL_ROLLS: Record<string, string> = {
  'exuberimpresence': 'Shaper and Elder',
  'exkaom': 'no sockets',
  'extabula': '6-link',
  'exforgesword': 'Shaper or Elder',
  'exrationaljewel': 'synthesised',
  'exsynth': 'synthesised',
  'ex6link': '6-link',
  '4xabysshelmet': '4 abyss sockets',
  '3xabyss': '3 abyss sockets'
}

// A guess where poe.ninja has no usable price. Early league bases start
// high and give way to the real price once there's a market (Guy).
const GUESS: Record<string, number> = { t1: 300, t2: 50, multispecialhigh: 30, multispecial: 10, earlyleague: 20, t3boss: 5, t3: 2, hideable2: 0.5, hideable: 0.2, restex: 0.1 }
export const uniqueGuess = (tier: string | null): number => (tier && GUESS[tier]) || 1

// Stands in for a Class list: the rules match `Rarity Unique`.
export const UNIQUE_CLS = 'Rarity Unique'
