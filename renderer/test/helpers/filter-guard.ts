// The loot filter guard: NeverSink's most valuable drops, the preset setups
// to try them under, and hostile prices. The guard tests (filter-guard*.test.ts)
// run every setup through the same compose path the editor saves with and
// check the drops still show, beep and beam.
import { composeFilter } from '@/web/woke/loot-filter/compose'
import type { ComposeInput } from '@/web/woke/loot-filter/compose'
import { matchItem } from '@/web/woke/loot-filter/match'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import type { FilterBlock, FilterDoc } from '@/web/woke/loot-filter/parse'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { ARCHETYPES, defaultPresets, normalizePresets, RECIPE_SLOTS, tierNumber } from '@/web/woke/loot-filter/presets'
import type { Presets, UniqueBreakdown } from '@/web/woke/loot-filter/presets'
import { DEFAULT_BUILD_RULES, WEAPON_CLASSES } from '@/web/woke/loot-filter/build-rules'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import type { FilterEdit } from '@/web/woke/loot-filter/edits'
import { PRESET_NAMES } from '@/web/woke/loot-filter/timeline'
import { LEVELS, neverSink, neverSinkStyled } from './neversink'

export const FILTERS = [
  ...LEVELS.map(level => ({ name: level as string, text: neverSink(level) })),
  { name: 'VAAL-3-STRICT (style)', text: neverSinkStyled() }
]

// ---- The drops ----

export interface Precious {
  name: string
  // In plain words, why it matters.
  why: string
  facts: Partial<ItemFacts>
  // NeverSink's rule for it, as type/tier, the same at every strictness.
  rule: string
  // What poe.ninja would say a base is worth (hostile prices use it).
  chaos: number
  // A unique's base: the unique price goes through the base.
  uniqueBase?: boolean
  // Files where NeverSink itself hides it (the guard then only checks we're
  // no worse).
  hiddenIn?: string[]
}

const currency = (baseType: string, why: string, rule: string, chaos: number): Precious =>
  ({ name: baseType, why, rule, chaos, facts: { itemClass: 'Stackable Currency', baseType, stackSize: 1 } })
const card = (baseType: string, why: string, chaos: number): Precious =>
  ({ name: baseType, why, rule: 'divination/t1', chaos, facts: { itemClass: 'Divination Cards', baseType, stackSize: 1 } })

export const PRECIOUS: Precious[] = [
  currency('Mirror of Kalandra', 'the rarest currency', 'currency/t1exalted', 100_000),
  currency('Divine Orb', 'the main trade currency', 'currency/t1exalted', 200),
  currency('Mirror Shard', 'twenty make a Mirror', 'currency/t1exalted', 5_000),
  currency('Fracturing Orb', 'top crafting currency', 'currency/t1exalted', 1_500),
  currency("Awakener's Orb", 'top crafting currency', 'currency/t1exalted', 400),
  currency('Sacred Orb', 'NeverSink\'s second currency tier', 'currency/t2divine', 300),
  { name: 'Headhunter', why: 'top unique belt', rule: 'uniques/multispecialhigh', chaos: 30_000, uniqueBase: true, facts: { itemClass: 'Belts', baseType: 'Leather Belt', rarity: 'Unique', width: 2, height: 1 } },
  { name: 'Mageblood', why: 'top unique belt', rule: 'uniques/multispecialhigh', chaos: 60_000, uniqueBase: true, facts: { itemClass: 'Belts', baseType: 'Heavy Belt', rarity: 'Unique', width: 2, height: 1 } },
  card('The Apothecary', 'a Mageblood in cards', 40_000),
  card('House of Mirrors', 'a Mirror in cards', 100_000),
  { name: "The Maven's Writ", why: 'top fragment', rule: 'fragments/t1', chaos: 300, facts: { itemClass: 'Map Fragments', baseType: "The Maven's Writ", stackSize: 1 } },
  { name: 'Empower Support (level 3)', why: 'exceptional gem', rule: 'gems->exceptional/t1', chaos: 5_000, facts: { itemClass: 'Support Gems', baseType: 'Empower Support', gemLevel: 3, width: 1, height: 1 } },
  {
    name: 'Two-Stone Ring, item tier 5',
    why: 'NeverSink\'s best tiered gear (t5r1), the drop PR #426 found muted',
    rule: 'gear->tiered/t5r1',
    chaos: 0,
    facts: { itemClass: 'Rings', baseType: 'Two-Stone Ring', rarity: 'Rare', identified: false, unidentifiedItemTier: 5, itemLevel: 84, width: 1, height: 1 }
  },
  {
    name: 'Six-link Assassin\'s Garb',
    why: 'a 6-link on a top base',
    rule: '6l/hightier',
    chaos: 0,
    facts: { itemClass: 'Body Armours', baseType: "Assassin's Garb", rarity: 'Rare', socketGroups: ['RRGGBB'], itemLevel: 84, width: 2, height: 3 }
  },
  // While levelling: the levelling presets (weapons for your build, R-G-B,
  // movement speed boots) only reach drops below area level 68.
  {
    name: 'Six-link Reaver Sword while levelling',
    why: 'a 6-link in the campaign, whatever the weapon',
    rule: '6l/others',
    chaos: 0,
    hiddenIn: ['6-UBER-PLUS-STRICT'],
    facts: { itemClass: 'Two Hand Swords', baseType: 'Reaver Sword', rarity: 'Normal', socketGroups: ['RRGGBB'], itemLevel: 50, areaLevel: 50, width: 2, height: 4 }
  },
  { name: 'Divine Orb while levelling', why: 'a Divine in the campaign', rule: 'currency/t1exalted', chaos: 200, facts: { itemClass: 'Stackable Currency', baseType: 'Divine Orb', stackSize: 1, areaLevel: 45 } }
]

export function facts (p: Partial<ItemFacts>): ItemFacts {
  return {
    name: p.baseType ?? 'x',
    rarity: 'Normal',
    influences: [],
    explicitModNames: [],
    areaLevel: 83,
    itemLevel: 83,
    identified: true,
    corrupted: false,
    mirrored: false,
    fractured: false,
    synthesised: false,
    replica: false,
    foulborn: false,
    vestigial: false,
    crucibleTree: false,
    transfigured: false,
    imbued: false,
    exceptional: false,
    zanaMemory: false,
    blightedMap: false,
    uberBlightedMap: false,
    anyEnchantment: false,
    hasImplicitMod: false,
    enchantments: [],
    enchantPassiveNodes: [],
    exarchTier: 0,
    eaterTier: 0,
    corruptedMods: 0,
    memoryStrands: 0,
    quality: 0,
    socketGroups: [],
    ...p
  }
}

// ---- How a drop looks ----

const SOUND_KEYS = ['PlayAlertSound', 'PlayAlertSoundPositional', 'CustomAlertSound', 'CustomAlertSoundOptional']

export interface Look {
  shown: boolean
  sound: boolean
  beam: boolean
  icon: boolean
  font: number
  rule: string
  // NeverSink's rank of the rule (1 the top), null when it has none.
  rank: number | null
}

export function lookOf (actions: FilterBlock['actions'], visibility: string, block: FilterBlock | null): Look {
  const font = actions.find(a => a.key === 'SetFontSize')
  return {
    shown: visibility !== 'Hide',
    // DisableDropSound only stops the game's plain drop sound, not these.
    sound: actions.some(a => SOUND_KEYS.includes(a.key)),
    beam: actions.some(a => a.key === 'PlayEffect' && a.args[0] !== 'None'),
    icon: actions.some(a => a.key === 'MinimapIcon' && a.args[0] !== '-1'),
    font: font ? Number(font.args[0]) : 32,
    rule: block ? `${block.type}/${block.tier}` : '(none)',
    rank: block ? tierNumber(block) : null
  }
}

export function dropLook (doc: FilterDoc, f: Partial<ItemFacts>): Look {
  const m = matchItem(doc, facts(f))
  return lookOf(m.actions, m.visibility, m.final?.block ?? null)
}

export const blockLook = (b: FilterBlock): Look => lookOf(b.actions, b.visibility, b)

// ---- Hostile prices ----
// Everything not in the list above is worth almost nothing, so every price
// preset hides as much as it ever could. The drops above are worth what
// poe.ninja says.

const valueOf = new Map<string, number>()
for (const p of PRECIOUS) valueOf.set(p.facts.baseType!, p.chaos)

export function hostilePrices (over: Record<string, number> = {}): ComposeInput['prices'] {
  const chaos = (base: string) => over[base] ?? valueOf.get(base)
  const lookup: PriceLookup = (_g, base) => ({ chaos: chaos(base) || 0.01, thin: false })
  const breakdown: UniqueBreakdown = (_g, base) => {
    const p = PRECIOUS.find(x => x.uniqueBase && x.facts.baseType === base)
    return [{ name: 'Junk unique', chaos: 0.01, thin: false }, ...(p ? [{ name: p.name, chaos: over[base] ?? p.chaos, thin: false }] : [])]
  }
  return { lookup, safety: lookup, breakdown, pricedTypes: null }
}

export const BUILD = { buildName: 'Arc', gems: ['Arc'], linkColours: [], uniqueBases: [], rareBases: [], weaponClasses: ['Wands'] }

export interface Setup {
  name: string
  presets: Presets
  edits?: FilterEdit[]
  netOn?: boolean
  // A PoB build loaded (adds build rules); on unless false.
  build?: boolean
}

export function compose (text: string, s: Setup, prices = hostilePrices()) {
  return composeFilter(text, {
    presets: s.presets,
    rules: [],
    edits: s.edits ?? [],
    buildRules: { ...DEFAULT_BUILD_RULES },
    build: s.build === false ? null : BUILD,
    moves: [],
    safetyNet: { on: s.netOn ?? false, minChaos: 20 },
    prices,
    // As disenchant/calc dustBases makes it: only bases where every unique is
    // cheap enough, so never one a precious unique drops on.
    dustList: ['Ezomyte Burgonet', 'Iron Ring'],
    heldBack: () => false,
    stackHeld: () => false
  })
}

// ---- Preset setups ----

type Key = keyof Presets
// Each preset at its harshest: as much hidden, quieted and dimmed as the
// settings allow.
export const HARSHEST: { [K in Key]: Presets[K] } = {
  cheapCurrency: { on: true, chaos: 50 },
  chaosRecipe: { on: true, slots: RECIPE_SLOTS.map(s => s.key) },
  quiet: { on: true, keepTiers: 1 },
  bigger: { on: true, size: 45 },
  colourBlind: { on: true },
  sixSockets: { on: true },
  dust: { on: true, fromPrices: true, line: 100 },
  hideGear: { on: true },
  cheapCards: { on: true, chaos: 50 },
  lowMaps: { on: true, tier: 17 },
  hideFlasks: { on: true },
  cheapUniques: { on: true, chaos: 50 },
  cheapSplinters: { on: true, chaos: 50 },
  msBoots: { on: true },
  hideRgb: { on: true },
  vendorQuality: { on: true },
  volume: { on: true, percent: 5 },
  beams: { on: true, keepTiers: 1 },
  weapons: { on: true, archetype: 'custom', classes: [] }
}

export const PRESET_KEYS = Object.keys(HARSHEST) as Key[]

// The harshest settings in words, for setup names.
const HARSH_WORDS: Partial<Record<Key, string>> = {
  cheapCurrency: 'under 50c',
  chaosRecipe: 'every slot',
  quiet: 'keeps tier 1 only',
  bigger: 'size 45',
  dust: 'from prices',
  cheapCards: 'under 50c',
  lowMaps: 'below tier 17',
  cheapUniques: 'under 50c',
  cheapSplinters: 'under 50c',
  volume: '5%',
  beams: 'tier 1 only',
  weapons: 'no weapon types kept'
}

// "Quiet mode (keeps tier 1 only)": the preset as the editor names it.
export function harshName (k: Key): string {
  const name = PRESET_NAMES[k]
  const words = HARSH_WORDS[k]
  return name[0].toUpperCase() + name.slice(1) + (words ? ` (${words})` : '')
}

export function presets (patch: Partial<Presets>): Presets {
  return normalizePresets({ ...defaultPresets(), ...JSON.parse(JSON.stringify(patch)) })
}

const allOn = (): Presets => {
  const d = defaultPresets()
  for (const k of PRESET_KEYS) (d[k] as { on: boolean }).on = true
  return normalizePresets(d)
}

export const SETUPS: Setup[] = [
  { name: 'No presets', presets: defaultPresets() },
  ...PRESET_KEYS.map(k => ({ name: harshName(k), presets: presets({ [k]: HARSHEST[k] }) })),
  { name: 'Quiet mode (default, keeps tiers 1-2)', presets: presets({ quiet: { on: true, keepTiers: 2 } }) },
  { name: 'Fewer beams (default, tiers 1-2)', presets: presets({ beams: { on: true, keepTiers: 2 } }) },
  { name: 'Every preset, default settings', presets: allOn() },
  { name: 'Every preset, harshest settings', presets: presets(HARSHEST) },
  { name: 'Every preset, harshest, safety net on', presets: presets(HARSHEST), netOn: true }
]

// Every pair of presets at their harshest.
export function pairSetups (): Setup[] {
  const out: Setup[] = []
  PRESET_KEYS.forEach((a, i) => PRESET_KEYS.slice(i + 1).forEach(b => {
    out.push({ name: `${harshName(a)} + ${harshName(b)}`, presets: presets({ [a]: HARSHEST[a], [b]: HARSHEST[b] }) })
  }))
  return out
}

// Seeded random setups: any mix of presets, any settings in range.
export function rng (seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomSetup (seed: number): Setup {
  const r = rng(seed)
  const pick = <T>(list: readonly T[]) => list[Math.floor(r() * list.length)]
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1))
  const p = defaultPresets()
  for (const k of PRESET_KEYS) (p[k] as { on: boolean }).on = r() < 0.5
  p.cheapCurrency.chaos = pick([0.1, 1, 5, 20, 50])
  p.cheapCards.chaos = pick([0.1, 2, 10, 50])
  p.cheapUniques.chaos = pick([0.1, 1, 10, 50])
  p.cheapSplinters.chaos = pick([0.1, 1, 50])
  p.quiet.keepTiers = int(1, 5)
  p.beams.keepTiers = int(1, 5)
  p.bigger.size = int(25, 45)
  p.volume.percent = int(5, 100)
  p.lowMaps.tier = int(2, 17)
  p.dust.fromPrices = r() < 0.5
  p.dust.line = pick([100, 5000, 1_000_000])
  p.weapons.archetype = pick(ARCHETYPES).key
  p.weapons.classes = p.weapons.archetype === 'custom' ? WEAPON_CLASSES.filter(() => r() < 0.4) : []
  p.chaosRecipe.slots = RECIPE_SLOTS.map(s => s.key).filter(() => r() < 0.7)
  return { name: `random #${seed}`, presets: normalizePresets(p), netOn: r() < 0.5 }
}

// What a setup is allowed to take away from a drop: quiet mode takes the
// sound of a rule ranked below its line, the beam preset its beam and icon.
// Nothing else may.
export function allowedLoss (s: Setup, rank: number | null) {
  const below = (on: boolean, keep: number) => on && rank != null && rank > keep
  return {
    sound: below(s.presets.quiet.on, s.presets.quiet.keepTiers),
    beam: below(s.presets.beams.on, s.presets.beams.keepTiers)
  }
}

// What a drop lost, in words, or [] when it kept everything it may not lose.
export function losses (before: Look, after: Look, s: Setup): string[] {
  const may = allowedLoss(s, before.rank)
  const out: string[] = []
  if (before.shown && !after.shown) out.push(`hidden (by ${after.rule})`)
  if (before.sound && !after.sound && !may.sound) out.push(`silenced (by ${after.rule})`)
  if (before.beam && !after.beam && !may.beam) out.push(`lost its beam (by ${after.rule})`)
  if (before.icon && !after.icon && !may.beam) out.push(`lost its map icon (by ${after.rule})`)
  if (after.shown && after.font < before.font) out.push(`label shrank ${before.font} -> ${after.font}`)
  return out
}

export const isNeverSinkBlock = (b: FilterBlock) => !b.type?.startsWith('woke->')
// NeverSink's top two looks wear a red beam.
export const isRedBeam = (b: FilterBlock) => !b.disabled && b.actions.some(a => a.key === 'PlayEffect' && a.args[0] === 'Red')

// ---- The check ----

const parsedSources = new Map<string, FilterDoc>()
export function source (name: string): FilterDoc {
  let doc = parsedSources.get(name)
  if (!doc) {
    doc = parseFilter(FILTERS.find(f => f.name === name)!.text)
    parsedSources.set(name, doc)
  }
  return doc
}
const sourceLooks = new Map<string, Look[]>()
function preciousBefore (name: string): Look[] {
  let looks = sourceLooks.get(name)
  if (!looks) {
    looks = PRECIOUS.map(p => dropLook(source(name), p.facts))
    sourceLooks.set(name, looks)
  }
  return looks
}

// Every way a setup broke a valuable drop or one of NeverSink's red-beam
// rules, in words. [] when it kept everything.
export function breaches (name: string, s: Setup, doc: FilterDoc = compose(FILTERS.find(f => f.name === name)!.text, s).doc): string[] {
  const before = source(name)
  const out: string[] = []
  const looks = preciousBefore(name)
  PRECIOUS.forEach((p, i) => {
    for (const loss of losses(looks[i], dropLook(doc, p.facts), s)) out.push(`${p.name}: ${loss}`)
  })
  // NeverSink's rules keep their order; only ours are added.
  const theirs = doc.blocks.filter(isNeverSinkBlock)
  if (theirs.length !== before.blocks.length) {
    out.push(`NeverSink had ${before.blocks.length} rules, ${theirs.length} left`)
    return out
  }
  before.blocks.forEach((b, i) => {
    const a = theirs[i]
    if (a.type !== b.type || a.tier !== b.tier) { out.push(`rule ${i} is ${a.type}/${a.tier}, was ${b.type}/${b.tier}`); return }
    if (!isRedBeam(b)) return
    for (const loss of losses(blockLook(b), blockLook(a), s)) out.push(`red-beam rule ${b.type}/${b.tier}: ${loss}`)
  })
  return out
}
