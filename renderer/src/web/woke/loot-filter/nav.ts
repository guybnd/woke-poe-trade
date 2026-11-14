// The rule list's drilldown: category (what you're looking for), then NeverSink's
// own chapter, then the group. Only how the list reads changes: the rules stay
// in the file's order, which is what the game goes by.
import type { GroupNode, SectionNode } from './groups'
import { UNTAGGED_PREFIX } from './parse'

export type NavMode = 'endgame' | 'campaign' | 'all'

export interface NavCategoryDef {
  id: string
  label: string
  // A picture from the game data. Tried in order, in case a league renames one.
  icon: { name: string, ns: 'ITEM' | 'UNIQUE' | 'GEM' | 'DIVINATION_CARD' } | null
  // Font Awesome, when there's no game picture.
  fa?: string
}

// In the order a player thinks of them. Each group goes to the first that claims it.
export const NAV_CATEGORIES: NavCategoryDef[] = [
  { id: 'yours', label: 'Yours', icon: null, fa: 'fas fa-star' },
  { id: 'currency', label: 'Currency', icon: { name: 'Chaos Orb', ns: 'ITEM' } },
  { id: 'fragments', label: 'Fragments and map items', icon: { name: 'Fragment of the Phoenix', ns: 'ITEM' } },
  { id: 'cards', label: 'Divination cards', icon: { name: 'The Doctor', ns: 'DIVINATION_CARD' } },
  { id: 'uniques', label: 'Uniques', icon: { name: 'Headhunter', ns: 'UNIQUE' } },
  { id: 'maps', label: 'Maps', icon: { name: 'Map', ns: 'ITEM' } },
  { id: 'gems', label: 'Gems', icon: { name: 'Enlighten Support', ns: 'GEM' } },
  { id: 'rare', label: 'Rare gear', icon: { name: 'Vermillion Ring', ns: 'ITEM' } },
  { id: 'crafting', label: 'Crafting bases', icon: { name: 'Orb of Fusing', ns: 'ITEM' } },
  { id: 'jewels', label: 'Jewels', icon: { name: 'Large Cluster Jewel', ns: 'ITEM' } },
  { id: 'flasks', label: 'Flasks and tinctures', icon: { name: 'Divine Life Flask', ns: 'ITEM' } },
  { id: 'heist', label: 'Heist', icon: { name: 'Rogue\'s Marker', ns: 'ITEM' } },
  { id: 'exotic', label: 'Exotic items', icon: { name: 'Fracturing Orb', ns: 'ITEM' } },
  { id: 'levelling', label: 'Levelling', icon: { name: 'Scroll of Wisdom', ns: 'ITEM' } },
  { id: 'other', label: 'Other rules', icon: null, fa: 'fas fa-list' }
]

const has = (type: string, ...starts: string[]) => starts.some(s => type === s || type.startsWith(`${s}->`))

export function categoryOf (type: string, section: string): string {
  const s = section.toLowerCase()
  if (type.startsWith('woke->')) return 'yours'
  if (type.startsWith(UNTAGGED_PREFIX)) return 'other'
  if (has(type, 'leveling->flasks', 'leveling->tincture', 'endgameflasks', 'endgametinctures')) return 'flasks'
  if (has(type, 'currency->leveling', 'currency->levelingstacked', 'currency', 'gold', 'vials', 'runesgrafts', 'mapenchantments')) return 'currency'
  if (has(type, 'leveling', 'decorators->leveling') || s.includes('leveling')) return 'levelling'
  if (has(type, 'fragments', 'miscmapitems', 'miscmapitemsextra', 'viscera')) return 'fragments'
  if (has(type, 'divination')) return 'cards'
  if (has(type, 'uniques')) return 'uniques'
  if (has(type, 'maps', 'maphiders', 'expedition', 'charts', 'exoticmap')) return 'maps'
  if (has(type, 'gems')) return 'gems'
  if (has(type, 'jewels')) return 'jewels'
  if (has(type, 'heist', 'heisttarget')) return 'heist'
  if (has(type, 'crafting', 'exoticbases', 'exoticbaseslower', 'chancing', 'socketslinks', 'endgamergb', 'normalcraft')) return 'crafting'
  if (has(type, 'rareid', 'rareblendid', 'magicid', 'corruptedid', 'influenced', 'rare', 'rr', 'hidelayer', 'rareoptional', 'decorators', 'gear', 'animatedweapons', 'anyremaining')) return 'rare'
  if (has(type, 'exotic', 'exoticmods', 'artefact', 'questlike', 'questlikeexception', 'enshrouded', 'event', 'corpses', '6l')) return 'exotic'
  return 'other'
}

export function isLevelling (type: string, section: string): boolean {
  return type.includes('leveling') || section.toLowerCase().includes('leveling')
}

function shown (type: string, section: string, mode: NavMode): boolean {
  if (type.startsWith('woke->') || mode === 'all') return true
  return mode === 'campaign' ? isLevelling(type, section) : !isLevelling(type, section)
}

// NeverSink has 50 chapters, many with one group, so several read as one here.
const CHAPTERS: Record<string, string> = {
  'gold': 'General',
  'currency - regular currency tiering': 'General',
  'remaining currency': 'General',
  'currency - special': 'League',
  'currency - exceptions - stacked currency': 'Stacks',
  'currency - leveling exceptions': 'Levelling',
  'misc map items': 'Fragments',
  'replica and foulborn uniques': 'Replica and Foulborn',
  'special maps': 'Special',
  'influenced items': 'Influence and eldritch',
  'eldritch items': 'Influence and eldritch',
  'normal map progression': 'Normal',
  'pseudo-map-items': 'Map-like items',
  'identified mod filtering - combinations': 'Identified mods',
  'identified mod filtering - dual mods': 'Identified mods',
  'identified mod filtering - single mods': 'Identified mods',
  'identified mod - corrupted items': 'Identified mods',
  'high priority equipment properties': 'High priority',
  'endgame - rare - decorators': 'Endgame rares',
  'endgame - rare - exotic veiled': 'Endgame rares',
  'endgame - rare - exotic corrupted': 'Endgame rares',
  'endgame - rare - conditional hide rules': 'Endgame rares',
  'endgame - rare - amulets, rings, boots': 'Endgame rares',
  'endgame - rare - gear - droplevel hiding': 'Endgame rares',
  'misc rules': 'Other',
  'exotic bases': 'Exotic bases',
  'recipes and 5links': 'Recipes and links',
  'high level crafting bases': 'High level',
  'endgame - crafting': 'High level',
  'chancing bases': 'Recipes and links',
  'endgame flasks & tinctures': 'Endgame',
  'leveling - utility flasks and tinctures': 'Levelling',
  'leveling - life, mana, hybrid': 'Levelling',
  'heist gear': 'Gear',
  'questlike-items1 (override uniques)': 'Targets',
  'global overriding rules': 'Other',
  'exotic mods filtering': 'Exotic mods',
  'exotic item classes': 'Item classes',
  'exotic item variations': 'Variations',
  'enshrouded items': 'Other',
  'idols (event leagues only)': 'Other',
  'questlike-items2': 'Item classes',
  'leveling - rules': 'Rules',
  'leveling - useful magic and normal items': 'Useful items'
}

// NeverSink's chapter under the name it goes by here. Another filter's chapters
// keep theirs.
export function chapterLabel (section: string): string {
  const named = CHAPTERS[section.toLowerCase()]
  if (named) return named
  const out = section.replace(/^(currency|endgame - rare|endgame|leveling)\s*-\s*/i, '').trim() || section
  return out.charAt(0).toUpperCase() + out.slice(1)
}

// In a list that already says where it is, "Currency › Essence" is just "Essence".
export function shortGroupName (full: string): string {
  const parts = full.split(' › ')
  return parts.length > 1 ? parts.slice(1).join(' › ') : full
}

// A category this short reads better as one list. Only rules with no tags are
// known by their chapter alone, so those keep theirs.
const FLAT_UNDER = 8

export interface NavChapter {
  id: string
  title: string
  groups: GroupNode[]
}

export interface NavCategory extends NavCategoryDef {
  chapters: NavChapter[]
  groupCount: number
}

export function buildNav (tree: SectionNode[], mode: NavMode = 'all'): NavCategory[] {
  const cats = new Map<string, Map<string, GroupNode[]>>()
  for (const sec of tree) {
    for (const g of sec.groups) {
      if (!shown(g.type, sec.title, mode)) continue
      const id = categoryOf(g.type, sec.title)
      if (!cats.has(id)) cats.set(id, new Map())
      const chapters = cats.get(id)!
      const chapter = chapterLabel(sec.title)
      if (!chapters.has(chapter)) chapters.set(chapter, [])
      chapters.get(chapter)!.push(g)
    }
  }
  return NAV_CATEGORIES.flatMap(def => {
    const chapters = cats.get(def.id)
    if (!chapters) return []
    let list = [...chapters].map(([id, groups]) => ({ id, title: id, groups }))
    const groupCount = list.reduce((n, c) => n + c.groups.length, 0)
    if (def.id !== 'other' && groupCount < FLAT_UNDER) list = [{ id: def.label, title: def.label, groups: list.flatMap(c => c.groups) }]
    return [{ ...def, chapters: list, groupCount }]
  })
}

export interface NavSpot {
  group: GroupNode
  category: NavCategory
  chapter: NavChapter
}

export function allSpots (nav: NavCategory[]): NavSpot[] {
  return nav.flatMap(category => category.chapters.flatMap(chapter => chapter.groups.map(group => ({ group, category, chapter }))))
}

export function findSpot (nav: NavCategory[], type: string | null): NavSpot | null {
  return type == null ? null : allSpots(nav).find(s => s.group.type === type) ?? null
}

// The filter box: every level at once. A name that starts with the text comes first.
export function filterNav (nav: NavCategory[], query: string, nameOf: (g: GroupNode) => string): NavSpot[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hay = (s: NavSpot) => `${nameOf(s.group)} ${s.chapter.title} ${s.category.label}`.toLowerCase()
  const rank = (s: NavSpot) => nameOf(s.group).toLowerCase().startsWith(q) ? 0 : nameOf(s.group).toLowerCase().includes(q) ? 1 : 2
  return allSpots(nav).filter(s => hay(s).includes(q)).sort((a, b) => rank(a) - rank(b))
}

// One step of the drilldown: a category with a single chapter skips straight to
// its groups.
export function openCategory (cat: NavCategory): { cat: string, chapter: string | null } {
  return { cat: cat.id, chapter: cat.chapters.length === 1 ? cat.chapters[0].id : null }
}

// One level back up, skipping a chapter level that was skipped on the way in.
export function levelUp (nav: NavCategory[], at: { cat: string | null, chapter: string | null }): { cat: string | null, chapter: string | null } {
  if (at.chapter == null) return { cat: null, chapter: null }
  const cat = nav.find(c => c.id === at.cat)
  return !cat || cat.chapters.length === 1 ? { cat: null, chapter: null } : { cat: at.cat, chapter: null }
}
