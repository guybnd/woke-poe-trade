// What the active build means for where you are: which skill set and item
// set fit your level or act, the link colours you need, the gems to buy in
// this town, and the facts the price check and the loot filter use.
// Pure functions; no Vue, no app data imports.
import { MAX_SEARCH_LENGTH } from '../shared/library'
import { baseClass, CLASS_NAMES, gemData } from './gems'
import type { GemColour, GemSource } from './gems'
import type { LoadoutPick, PobDetails, PobGem, PobItem, PobItemSet, PobSkillGroup, PobSkillSet, PobTreeSpec } from './widget'

// ---- stages: "Act 2", "Level 12-28", "lvl 40", "Endgame" ----

export interface Stage { kind: 'act' | 'level', at: number }

// Rough character level when each act starts, to compare "Act N" titles
// with "Level N" titles.
const ACT_START_LEVEL = [0, 1, 13, 23, 33, 40, 45, 50, 55, 61, 64]

export function stageOf (title: string): Stage | null {
  const act = /\b(?:act|a)\s*(\d{1,2})\b/i.exec(title)
  if (act) {
    const n = Number(act[1])
    if (n >= 1 && n <= 10) return { kind: 'act', at: n }
  }
  const inRange = (n: number) => n >= 1 && n <= 100
  const named = /\b(?:level|lvl|lv)\.?\s*(\d{1,3})/i.exec(title)
  if (named && inRange(Number(named[1]))) return { kind: 'level', at: Number(named[1]) }
  if (/end\s*game|maps?\b|mapping|final|late/i.test(title)) return { kind: 'level', at: 70 }
  // A bare number, but not "6L"/"5 link", "T16" or "20%": those aren't levels.
  const bare = /(?<![\w.])(\d{1,3})(?!\s*(?:l\b|links?\b|-?link|%|\.\d))/i.exec(title)
  if (bare && !/\bt(?:ier)?\s*$/i.test(title.slice(0, bare.index)) && inRange(Number(bare[1]))) return { kind: 'level', at: Number(bare[1]) }
  return null
}

function stageLevel (s: Stage): number {
  return s.kind === 'act' ? ACT_START_LEVEL[s.at] : s.at
}

// With only one of level/act known, compare through the act start levels.
function reached (s: Stage, level: number | null, act: number | null): boolean {
  if (s.kind === 'act') {
    if (act != null) return s.at <= act
    return level != null ? stageLevel(s) <= level : s.at === 1
  }
  if (level != null) return s.at <= level
  return act != null ? s.at <= ACT_START_LEVEL[act] : s.at <= 1
}

export interface Picked<T> {
  item: T
  // Items whose stage starts after the picked one (for "later" gems).
  later: T[]
  // True when the title or a pick says where it fits; false for the active fallback.
  byStage: boolean
}

// The furthest stage you have reached; before the first one, the first one;
// with no stage titles, PoB's active set. A title picked by hand beats all
// of that, unless PoB no longer has a set by that name.
export function pickStage<T extends { title: string, isActive: boolean }> (items: T[], level: number | null, act: number | null, chosen?: string): Picked<T> | null {
  if (!items.length) return null
  const staged = items
    .map(item => ({ item, stage: stageOf(item.title) }))
    .filter((x): x is { item: T, stage: Stage } => x.stage != null)
    .sort((a, b) => stageLevel(a.stage) - stageLevel(b.stage))
  const hand = chosen != null ? items.find(i => i.title === chosen) : undefined
  if (hand) {
    const at = stageOf(hand.title)
    return {
      item: hand,
      later: at ? staged.filter(x => stageLevel(x.stage) > stageLevel(at)).map(x => x.item) : [],
      byStage: true
    }
  }
  if (!staged.length || (level == null && act == null)) {
    const item = items.find(i => i.isActive) ?? items[0]
    return { item, later: [], byStage: false }
  }
  const hit = staged.filter(x => reached(x.stage, level, act)).pop() ?? staged[0]
  return {
    item: hit.item,
    later: staged.filter(x => stageLevel(x.stage) > stageLevel(hit.stage)).map(x => x.item),
    byStage: true
  }
}

export function skillSetsOf (d: PobDetails): PobSkillSet[] {
  return d.skillSets?.length ? d.skillSets : [{ title: 'Default', isActive: true, groups: d.skills }]
}

export function itemSetsOf (d: PobDetails): PobItemSet[] {
  return d.itemSets ?? []
}

export interface Loadout {
  skillSet: Picked<PobSkillSet> | null
  itemSet: Picked<PobItemSet> | null
  tree: PobTreeSpec | null
}

// The sets in use: the same answer for every window that asks.
export function loadoutOf (d: PobDetails, level: number | null, act: number | null, pick?: LoadoutPick): Loadout {
  // A skill set pick takes its same-named item set and tree along. An item
  // set pick changes only the gear.
  const skillTitle = pick?.skillSet
  return {
    skillSet: pickStage(skillSetsOf(d), level, act, skillTitle),
    itemSet: pickStage(itemSetsOf(d), level, act, pick?.itemSet ?? pick?.skillSet),
    tree: pickStage(d.trees, level, act, skillTitle)?.item ?? null
  }
}

// ---- gems and links ----

export function isSupport (g: PobGem): boolean {
  if (g.support != null) return g.support
  return /support/i.test(g.name) || (gemData(g.name)?.name.endsWith(' Support') ?? false)
}

function activeGems (group: PobSkillGroup): PobGem[] {
  return group.gems.filter(g => g.enabled && g.name)
}

// The group the build is about: PoB's main group, else the biggest group
// with an active skill in it.
export function mainGroupOf (groups: PobSkillGroup[]): PobSkillGroup | null {
  const live = groups.filter(g => g.enabled && activeGems(g).length)
  const main = live.find(g => g.isMain)
  if (main) return main
  let best: PobSkillGroup | null = null
  for (const g of live) {
    if (!activeGems(g).some(x => !isSupport(x))) continue
    if (!best || activeGems(g).length > activeGems(best).length) best = g
  }
  return best ?? live[0] ?? null
}

// Groups worth showing as "your links": the main one first, then other
// groups with 2+ gems.
export function linkGroups (groups: PobSkillGroup[], max = 3): PobSkillGroup[] {
  const main = mainGroupOf(groups)
  const rest = groups.filter(g => g !== main && g.enabled && activeGems(g).length >= 2)
    .sort((a, b) => activeGems(b).length - activeGems(a).length)
  return [...(main ? [main] : []), ...rest].slice(0, max)
}

// Active skill(s) first, then supports, in PoB order.
export function orderedGems (group: PobSkillGroup): PobGem[] {
  const gems = activeGems(group)
  return [...gems.filter(g => !isSupport(g)), ...gems.filter(g => isSupport(g))]
}

export function linkColours (group: PobSkillGroup): GemColour[] {
  return orderedGems(group).map(g => gemData(g.name)?.colour ?? 'w')
}

function permutations (letters: string[]): string[] {
  if (letters.length <= 1) return [letters.join('')]
  const out = new Set<string>()
  letters.forEach((l, i) => {
    const rest = [...letters.slice(0, i), ...letters.slice(i + 1)]
    for (const p of permutations(rest)) out.add(l + p)
  })
  return [...out]
}

function exactRegex (colours: GemColour[]): string | null {
  if (colours.some(c => c === 'w')) return null
  return permutations(colours).map(p => p.split('').join('-')).join('|')
}

function looseRegex (colours: GemColour[]): string {
  const coloured = colours.filter(c => c !== 'w')
  const cls = coloured.length ? `[${[...new Set(coloured)].sort().join('')}w]` : '.'
  return Array.from({ length: colours.length }, () => cls).join('-')
}

export interface SocketSearch {
  regex: string
  // How many linked sockets it looks for.
  size: number
  // Exact colour orderings; otherwise "only these colours or white".
  exact: boolean
}

// Regex for vendor or stash search that finds linked sockets in the colours
// of the first gems (active skill first). Tries 4 links, then 3; exact
// orderings when they fit in the box, otherwise a looser pattern as long as
// it still narrows the colours down. Colourless gems fit any socket.
export function socketRegex (colours: GemColour[]): SocketSearch | null {
  if (colours.length < 2) return null
  const top = Math.min(colours.length, 4)
  for (let n = top; n >= Math.min(3, top); n--) {
    const exact = exactRegex(colours.slice(0, n))
    if (exact && exact.length <= MAX_SEARCH_LENGTH) return { regex: exact, size: n, exact: true }
  }
  for (let n = top; n >= Math.min(3, top); n--) {
    const part = colours.slice(0, n)
    if (new Set(part.filter(c => c !== 'w')).size < 3) return { regex: looseRegex(part), size: n, exact: false }
  }
  const part = colours.slice(0, Math.min(3, top))
  return { regex: looseRegex(part), size: part.length, exact: false }
}

export const COLOUR_NAME: Record<GemColour, string> = { r: 'red', g: 'green', b: 'blue', w: 'white' }

// ---- gems to get ----

function sourcesFor (name: string, className: string): GemSource[] {
  const data = gemData(name)
  if (!data) return []
  const idx = CLASS_NAMES.indexOf(baseClass(className))
  return data.sources.filter(s => idx < 0 || s[4][idx] === '1')
}

// Unique enabled gem names of these skill sets, in order.
export function gemsOf (sets: PobSkillSet[]): string[] {
  const out: string[] = []
  for (const set of sets) {
    for (const group of set.groups) {
      if (!group.enabled) continue
      for (const g of group.gems) if (g.enabled && g.name && !out.includes(g.name)) out.push(g.name)
    }
  }
  return out
}

// Gems from the skill set for your stage and every later one; gems that
// only earlier sets used are done with.
export function relevantGems (d: PobDetails, level: number | null, act: number | null, pick?: LoadoutPick): string[] {
  const set = loadoutOf(d, level, act, pick).skillSet
  if (!set || !set.byStage) return gemsOf(skillSetsOf(d))
  return gemsOf([set.item, ...set.later])
}

export interface GemBuy {
  // As PoB names it.
  name: string
  requiredLevel: number
  npc: string
  // Quest that unlocks it at this vendor (or rewards it).
  quest: string
  act: number
}

// Where you can buy a gem while in this act: the act's own town vendors
// first, then Siosa (Library, Act 3), then Lilly Roth (every town from
// Act 6 on). Lower is better; null = not here.
function vendorRank (s: GemSource, act: number): number | null {
  if (s[3] !== 'v') return null
  if (s[2] === 'Lilly Roth') return act >= 6 ? 2 : null
  if (s[2] === 'Siosa') return act === 3 ? 1 : null
  return s[0] === act ? 0 : null
}

// How far ahead of your level to list gems, and how far behind a gem is
// assumed bought already.
const BUY_AHEAD = 3
const ASSUME_BOUGHT_BELOW = 10

// Build gems the vendors in this act's town sell, not ticked as got.
export function townBuys (d: PobDetails, className: string, level: number | null, act: number, got: string[], pick?: LoadoutPick): GemBuy[] {
  const lvl = level ?? 1
  const out: GemBuy[] = []
  for (const name of relevantGems(d, level, act, pick)) {
    if (got.includes(name)) continue
    const data = gemData(name)
    if (!data) continue
    if (data.requiredLevel > lvl + BUY_AHEAD || data.requiredLevel <= lvl - ASSUME_BOUGHT_BELOW) continue
    let src: GemSource | null = null
    let rank = Infinity
    for (const s of sourcesFor(name, className)) {
      const r = vendorRank(s, act)
      if (r != null && r < rank) { src = s; rank = r }
    }
    if (src) out.push({ name, requiredLevel: data.requiredLevel, npc: src[2] === 'Siosa' ? 'Siosa (Library)' : src[2], quest: src[1], act: src[0] })
  }
  return out.sort((a, b) => a.requiredLevel - b.requiredLevel || a.name.localeCompare(b.name))
}

// Build gems offered as a quest reward in this act, grouped by quest (you
// pick one gem per quest).
export function actRewards (d: PobDetails, className: string, level: number | null, act: number, got: string[], pick?: LoadoutPick): Array<{ quest: string, npc: string, gems: string[] }> {
  const byQuest = new Map<string, { quest: string, npc: string, gems: string[] }>()
  for (const name of relevantGems(d, level, act, pick)) {
    if (got.includes(name)) continue
    const src = sourcesFor(name, className).find(s => s[3] === 'q' && s[0] === act)
    if (!src) continue
    const entry = byQuest.get(src[1]) ?? { quest: src[1], npc: src[2], gems: [] }
    entry.gems.push(name)
    byQuest.set(src[1], entry)
  }
  return [...byQuest.values()]
}

// ---- gear ----

const SLOT_LABEL: Record<string, string> = {
  'Weapon 1': 'Weapon',
  'Weapon 2': 'Offhand',
  'Body Armour': 'Body',
  'Ring 1': 'Ring',
  'Ring 2': 'Ring 2'
}

export function slotLabel (slot: string): string {
  if (SLOT_LABEL[slot]) return SLOT_LABEL[slot]
  if (/^Flask \d/.test(slot)) return 'Flask'
  return slot
}

// As the inventory reads: weapons and armour, then jewellery, then flasks.
const GEAR_ORDER = ['Weapon 1', 'Weapon 2', 'Helmet', 'Body Armour', 'Gloves', 'Boots', 'Amulet', 'Ring 1', 'Ring 2', 'Ring 3', 'Belt', 'Flask 1', 'Flask 2', 'Flask 3', 'Flask 4', 'Flask 5']

export function gearOrder (slot: string): number {
  const i = GEAR_ORDER.indexOf(slot)
  return i < 0 ? GEAR_ORDER.length : i
}

// Gear slots only: no weapon swap and no abyssal sockets.
export function isGearSlot (slot: string): boolean {
  return !/Swap|Abyssal|Socket|Graft/i.test(slot)
}

// For normal and magic items PoB only keeps the full name; the caller can
// resolve a base from it (APT's item data).
export function itemBase (item: PobItem): string {
  return item.base || (item.rarity === 'NORMAL' ? item.name : '')
}

export interface BuildFacts {
  uniques: Array<{ name: string, base: string, slot: string }>
  // Bases of rare (and normal) items in the item set for your stage.
  bases: Array<{ base: string, slot: string }>
  // Item names, as filters and the trade site spell them.
  gems: string[]
  // Bases of items in weapon slots.
  weaponBases: string[]
}

export function buildFacts (d: PobDetails, level: number | null, act: number | null, pick?: LoadoutPick): BuildFacts {
  const facts: BuildFacts = { uniques: [], bases: [], gems: [], weaponBases: [] }
  const sets = itemSetsOf(d)
  // Uniques from every item set (levelling uniques and endgame ones).
  for (const set of sets) {
    for (const { slot, item } of set.slots) {
      if (!isGearSlot(slot)) continue
      if ((item.rarity === 'UNIQUE' || item.rarity === 'RELIC') && !facts.uniques.some(u => u.name === item.name)) {
        facts.uniques.push({ name: item.name, base: item.base, slot: slotLabel(slot) })
      }
    }
  }
  const worn = loadoutOf(d, level, act, pick).itemSet?.item
  for (const { slot, item } of worn?.slots ?? []) {
    if (!isGearSlot(slot)) continue
    const base = itemBase(item)
    if (/^Weapon [12]$/.test(slot) && base) facts.weaponBases.push(base)
    if (item.rarity === 'UNIQUE' || item.rarity === 'RELIC' || !base) continue
    if (!facts.bases.some(b => b.base === base)) facts.bases.push({ base, slot: slotLabel(slot) })
  }
  for (const name of gemsOf(skillSetsOf(d))) {
    const data = gemData(name)
    if (data && !facts.gems.includes(data.name)) facts.gems.push(data.name)
  }
  return facts
}

// ---- notes ----

// PoB's ^0-^9 codes. Black and dark grey would vanish on the panel.
const NOTE_COLOURS: Array<string | null> = [null, '#ff5555', '#55ff55', '#7f9fff', '#ffff55', '#ff55ff', '#55ffff', '#ffffff', '#b0b0b0', null]

function readable (hex: string): string | null {
  const n = parseInt(hex, 16)
  const luma = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)
  return luma < 70 ? null : `#${hex}`
}

// "^xFF0000Fire ^7and ice" -> coloured runs; null = the panel's text colour.
export function noteRuns (raw: string): Array<{ text: string, colour: string | null }> {
  const out: Array<{ text: string, colour: string | null }> = []
  let colour: string | null = null
  let at = 0
  const push = (text: string) => { if (text) out.push({ text, colour }) }
  for (const m of raw.matchAll(/\^x([0-9a-fA-F]{6})|\^(\d)/g)) {
    push(raw.slice(at, m.index))
    colour = m[1] ? readable(m[1]) : NOTE_COLOURS[Number(m[2])]
    at = m.index + m[0].length
  }
  push(raw.slice(at))
  return out
}

// ---- sockets on an item ----

// "R-G-B B" -> [['r','g','b'], ['b']]
export function socketGroups (sockets: string): string[][] {
  return sockets.trim().toLowerCase().split(/\s+/).filter(Boolean).map(g => g.split('-').filter(Boolean))
}

// Does one linked group hold these gem colours? White sockets fit anything,
// as do colourless gems.
export function groupFits (group: string[], colours: GemColour[]): boolean {
  if (group.length < colours.length) return false
  const left = [...group]
  const take = (c: string) => {
    const i = left.indexOf(c)
    if (i < 0) return false
    left.splice(i, 1)
    return true
  }
  let wild = 0
  for (const c of colours) {
    if (c === 'w') { wild++; continue }
    if (!take(c) && !take('w')) return false
  }
  return left.length >= wild
}

// The longest prefix of the colours (active gem first) that one linked
// group of the item holds, if it is 3 or more.
export function bestFit (sockets: string, colours: GemColour[]): number {
  let best = 0
  for (const group of socketGroups(sockets)) {
    for (let n = Math.min(group.length, colours.length); n >= 3; n--) {
      if (groupFits(group, colours.slice(0, n))) { best = Math.max(best, n); break }
    }
  }
  return best
}
