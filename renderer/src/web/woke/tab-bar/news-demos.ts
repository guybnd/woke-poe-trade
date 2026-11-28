// What's new lines with nothing to open on a tab (the price check, Search):
// Show me runs a sample instead, then flashes the feature in it
// (goto-flash.ts). Read only by the dock's card, so not at startup.
import type { ItemMenuRef } from '../ui/tooltip/item-menu-logic'
import { valdoMapText } from '../valdo/map-text'

export type NewsDemo =
  // A price check of this item (one trade search, as a check is), and the
  // spot in it, data-goto-spot on the element.
  | { check: ItemMenuRef, spot: string }
  // Ctrl+Space with this typed.
  | { search: string }

// Its tiers match public/data/mod-tiers.json (mod-tip.test.ts checks), or the
// rows show no ladder.
export const MOD_TIERS_ITEM = `Item Class: Body Armours
Rarity: Rare
Doom Shell
Twilight Regalia
--------
Energy Shield: 1050 (augmented)
--------
Item Level: 84
--------
{ Prefix Modifier "Unassailable" (Tier: 2) — Defences, Energy Shield }
96(92-100)% increased Energy Shield
{ Prefix Modifier "Rapturous" (Tier: 2) — Life }
+170(160-174) to maximum Life
{ Suffix Modifier "of Tzteosh" (Tier: 1) — Elemental, Fire, Resistance }
+47(46-48)% to Fire Resistance`

// A corpse as the game copies it.
export const CORPSE_ITEM = `Item Class: Corpses
Rarity: Currency
Perfect Hydra
--------
Item Level: 84
`

// A divination card as the game copies it.
export const DOCTOR_CARD = `Item Class: Divination Cards
Rarity: Divination Card
The Doctor
--------
Stack Size: 1/8
--------
Headhunter
Leather Belt
--------
A mind unfettered, a body freed of shackles.
`

export const NEWS_DEMOS: Record<string, NewsDemo> = {
  // A divination card: its full set's reward on the quick price card.
  'price-check-card-set': { check: { name: 'The Doctor', text: DOCTOR_CARD }, spot: 'card-set' },
  // A corpse: the quick price card (the window when poe.ninja has no row).
  'price-check-corpse-card': { check: { name: 'Perfect Hydra', text: CORPSE_ITEM }, spot: 'ninja-card' },
  'price-check-seller-spread': { check: { name: 'Exalted Orb' }, spot: 'seller-spread' },
  'price-check-gem-kinds': { check: { name: 'Ice Nova of Frostbolts' }, spot: 'related' },
  // A base has no check by name: the game's text of a plain one.
  'price-check-chance-uniques': { check: { name: 'Glorious Plate', rarity: 'normal', text: 'Item Class: Body Armours\nRarity: Normal\nGlorious Plate\n--------\nArmour: 776\n--------\nItem Level: 84\n' }, spot: 'related' },
  'price-check-vault-rewards': { check: { name: 'Orb of Intention' }, spot: 'related' },
  'price-check-boss-uniques': { check: { name: 'Hale Negator', rarity: 'unique' }, spot: 'related' },
  'price-check-related-exalts': { check: { name: 'Exalted Orb' }, spot: 'related' },
  // A Breach unique and its blessed upgrade.
  'price-check-related-upgrades': { check: { name: "Xoph's Inception", rarity: 'unique' }, spot: 'related' },
  // A Timeless jewel: its conquerors' keystones in the side list.
  'price-check-conquest-keystones': { check: { name: 'Elegant Hubris', rarity: 'unique' }, spot: 'related' },
  // A Shaper's Exalted Orb: its family and two fragment groups, folded to fit.
  // A unique with two Foulborn kinds and a Vestigial mod.
  'price-check-unique-foulborn': { check: { name: 'Carcass Jack', rarity: 'unique' }, spot: 'foulborn' },
  // A unique: its drop tier (and its loot filter tier, with a filter loaded) heads the side list.
  'price-check-unique-filter-tier': { check: { name: 'Carcass Jack', rarity: 'unique' }, spot: 'unique-tier' },
  'price-check-unique-recipe': { check: { name: 'The Will of Uul-Netol', rarity: 'unique' }, spot: 'related' },
  'div-card-map-chance': { search: 'Strand Map' },
  // A rolled jewel, unidentified: the unid price card (nothing searched until a click).
  'valdo-map-skips': { check: { name: 'Valdo Map', text: valdoMapText('Headhunter') }, spot: 'valdo-strip' },
  'search-keys-list': { search: 'keys' },
  // Uniques with a mod: priced rows, Goldwyrm's Vestigial line among them.
  'search-unique-mods': { search: 'item rarity' },
  // A kind word filters: the heading says Vestigial.
  'search-mod-filter-words': { search: 'rarity vestigial' },
  // Notables and keystones by their stats, under Passive tree.
  'search-tree-by-stat': { search: 'onslaught' },
  // A base with no saved price: its Price check button leads.
  'search-price-check-bases': { search: 'manifold ring' },
  // A rare with tiered mods: hover one for its ladder.
  'price-check-mod-tiers': { check: { name: 'Twilight Regalia', rarity: 'rare', base: 'Twilight Regalia', text: MOD_TIERS_ITEM }, spot: 'mod-tiers' },
  // A rare armour: its base roll % beside its defence, to search.
  // Worth knowing lines (worth-knowing.ts).
  'wk-mod-ctrl-click': { check: { name: 'Twilight Regalia', rarity: 'rare', base: 'Twilight Regalia', text: MOD_TIERS_ITEM }, spot: 'mod-tiers' },
  'wk-search-sums': { search: '2 div + 30c' },
  'wk-search-drops': { search: 'awakened enlighten' },
  'wk-search-map-cards': { search: 'dunes map' },
  'wk-search-keys': { search: 'keys' }
}

// Tools with no window of their own to open: a line about one needs a demo,
// or it gets no Show me at all (Guy: show it, or don't offer to).
const WINDOWLESS = new Set(['price-check'])
// Lines about something that only shows once you've used it (your own past
// searches): opening the tool shows nothing new, so no Show me.
// Type-to-search and the item strip's More start from your own keys and items.
// A line about one part of a window without a spot to flash: opening the
// window doesn't point at it (and does nothing when it's already open).
const NOTHING_TO_SHOW = new Set(['search-recent-queries', 'search-recent-save', 'search-type-to-open', 'item-menu-more'])
// Lines about a whole new tool: opening its window is the show. Any other
// line needs a tab, a spot, a sample or a Settings page (news.test.ts).
export const WHOLE_TOOL = new Set(['watchers-eye-finder'])

// Whether Show me has somewhere real to go: a tab, a sample, the Settings
// page the feature lives on, or the tool's own window. `byName`: the client
// can price check by name (English), which a sample check needs. `reader`: the
// stash reader is on; without it Net worth has nothing to show.
export function hasShowMe (n: { id: string, wmType: string, goto?: string, settingsPage?: string }, byName = true, reader = true): boolean {
  if (n.wmType === 'woke-net-worth' && !reader) return false
  if (NOTHING_TO_SHOW.has(n.id)) return false
  const demo = NEWS_DEMOS[n.id]
  if (demo) return !('check' in demo) || byName
  if (n.goto || n.settingsPage) return true
  return !WINDOWLESS.has(n.wmType)
}
