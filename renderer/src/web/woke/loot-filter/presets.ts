// One-click presets: common changes players make by hand, kept across
// NeverSink updates. Some add rules at the top (cheap currency, chaos recipe,
// 6-sockets); the others adjust NeverSink's own rules after your edits
// (quiet mode, bigger labels, colour-blind beams and icons). Your own rules are
// never touched; the safety net only takes the colour-blind colours.
import type { FilterBlock, FilterDoc } from './parse'
import { ECONOMY_GROUPS } from './economy'
import type { EconomyGroup, PriceLookup } from './economy'
import { RULE_TYPE, addedBlock } from './rules'
import { WEAPON_CLASSES } from './build-rules'

export const PRESET_TYPE = 'woke->preset'

export interface Presets {
  // Hide currency worth less than `chaos` once you're in maps.
  cheapCurrency: { on: boolean, chaos: number }
  // Unidentified ilvl 60-74 rares for the chaos recipe, per slot (a full
  // slot can be switched off).
  chaosRecipe: { on: boolean, slots: string[] }
  // Alert sounds only for the top tiers (t1..tN).
  quiet: { on: boolean, keepTiers: number }
  // Every shown label at least this font size.
  bigger: { on: boolean, size: number }
  // Beams and minimap icons in colours that stay apart for red-green
  // colour blindness.
  colourBlind: { on: boolean }
  // 6-socket items for the vendor (7 jeweller's orbs).
  sixSockets: { on: boolean }
  // Uniques worth disenchanting for Thaumaturgic Dust: NeverSink's own dust
  // tiers (shipped switched off), and/or bases from today's prices where
  // every unique gives at least `line` dust per chaos.
  dust: { on: boolean, fromPrices: boolean, line: number }
  // White and blue gear in maps: NeverSink's catch-all hide layer stays on,
  // and its early-map and below-ilvl-86 crafting tiers keep only rares.
  hideGear: { on: boolean }
  // Divination cards worth less than `chaos` (a stack counts as a whole).
  cheapCards: { on: boolean, chaos: number }
  // Maps below `tier`; uniques, blighted, influenced and special maps stay.
  lowMaps: { on: boolean, tier: number }
  // Flasks once in maps, except 20% quality and uniques.
  hideFlasks: { on: boolean }
  // Uniques in maps on bases where every unique is worth less than `chaos`.
  cheapUniques: { on: boolean, chaos: number }
  // Splinter and shard stacks worth less than `chaos` in maps.
  cheapSplinters: { on: boolean, chaos: number }
  // Magic and rare boots with movement speed while levelling.
  msBoots: { on: boolean }
  // NeverSink's chromatic (R-G-B) rules stop once you're in maps.
  hideRgb: { on: boolean }
  // 20% quality gems and flasks for the vendor recipes, levelling and early maps.
  vendorQuality: { on: boolean }
  // Every drop sound at this share of its volume.
  volume: { on: boolean, percent: number }
  // Beams and minimap icons only for the top tiers (t1..tN).
  beams: { on: boolean, keepTiers: number }
  // While levelling, hide white and blue weapons other builds use and dim
  // the rares. 'auto' takes the weapon classes of the PoB build.
  weapons: { on: boolean, archetype: Archetype }
  // TODO(3.30 launch): tiered magic/rare drops, once the filter keyword for
  // the new drop tiers is known.
}

export type Archetype = 'auto' | 'caster' | 'melee' | 'bow' | 'minion'

export function defaultPresets (): Presets {
  return {
    cheapCurrency: { on: false, chaos: 1 },
    chaosRecipe: { on: false, slots: RECIPE_SLOTS.map(s => s.key) },
    quiet: { on: false, keepTiers: 2 },
    bigger: { on: false, size: 36 },
    colourBlind: { on: false },
    sixSockets: { on: false },
    dust: { on: false, fromPrices: false, line: DUST_LINE },
    hideGear: { on: false },
    cheapCards: { on: false, chaos: 2 },
    lowMaps: { on: false, tier: 14 },
    hideFlasks: { on: false },
    cheapUniques: { on: false, chaos: 1 },
    cheapSplinters: { on: false, chaos: 1 },
    msBoots: { on: false },
    hideRgb: { on: false },
    vendorQuality: { on: false },
    volume: { on: false, percent: 60 },
    beams: { on: false, keepTiers: 2 },
    weapons: { on: false, archetype: 'auto' }
  }
}

// Weapon classes each archetype keeps; the rest are hidden while levelling.
export const ARCHETYPES: Array<{ key: Archetype, label: string, classes: string[] }> = [
  { key: 'auto', label: 'Auto (PoB build)', classes: [] },
  { key: 'caster', label: 'Caster', classes: ['Wands', 'Sceptres', 'Rune Daggers', 'Daggers', 'Staves'] },
  { key: 'melee', label: 'Melee attack', classes: ['Claws', 'Daggers', 'One Hand Axes', 'One Hand Maces', 'One Hand Swords', 'Thrusting One Hand Swords', 'Sceptres', 'Staves', 'Warstaves', 'Two Hand Axes', 'Two Hand Maces', 'Two Hand Swords'] },
  { key: 'bow', label: 'Bow', classes: ['Bows'] },
  { key: 'minion', label: 'Minion', classes: ['Wands', 'Sceptres', 'Rune Daggers', 'Staves'] }
]

const DUST_LINE = 5000
// Dust in the price rule is worked out for drops at this item level or more.
export const DUST_ILVL = 82
const NEVERSINK_DUST_TIERS = /^exdust\d+$/

export function isNeverSinkDustTier (b: Pick<FilterBlock, 'type' | 'tier'>): boolean {
  return b.type === 'uniques' && NEVERSINK_DUST_TIERS.test(b.tier ?? '')
}

export function normalizePresets (p: Partial<Presets> | undefined): Presets {
  const d = defaultPresets()
  const num = (v: unknown, lo: number, hi: number, dflt: number) => typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt
  const on = (v: { on?: unknown } | undefined) => typeof v?.on === 'boolean' ? v.on : false
  return {
    cheapCurrency: { on: on(p?.cheapCurrency), chaos: num(p?.cheapCurrency?.chaos, 0.1, 50, d.cheapCurrency.chaos) },
    chaosRecipe: { on: on(p?.chaosRecipe), slots: Array.isArray(p?.chaosRecipe?.slots) ? p!.chaosRecipe!.slots.filter(s => RECIPE_SLOTS.some(r => r.key === s)) : d.chaosRecipe.slots },
    quiet: { on: on(p?.quiet), keepTiers: Math.round(num(p?.quiet?.keepTiers, 1, 5, d.quiet.keepTiers)) },
    bigger: { on: on(p?.bigger), size: Math.round(num(p?.bigger?.size, 25, 45, d.bigger.size)) },
    colourBlind: { on: on(p?.colourBlind) },
    sixSockets: { on: on(p?.sixSockets) },
    dust: { on: on(p?.dust), fromPrices: typeof p?.dust?.fromPrices === 'boolean' ? p.dust.fromPrices : false, line: Math.round(num(p?.dust?.line, 100, 1_000_000, d.dust.line)) },
    hideGear: { on: on(p?.hideGear) },
    cheapCards: { on: on(p?.cheapCards), chaos: num(p?.cheapCards?.chaos, 0.1, 50, d.cheapCards.chaos) },
    lowMaps: { on: on(p?.lowMaps), tier: Math.round(num(p?.lowMaps?.tier, 2, 17, d.lowMaps.tier)) },
    hideFlasks: { on: on(p?.hideFlasks) },
    cheapUniques: { on: on(p?.cheapUniques), chaos: num(p?.cheapUniques?.chaos, 0.1, 50, d.cheapUniques.chaos) },
    cheapSplinters: { on: on(p?.cheapSplinters), chaos: num(p?.cheapSplinters?.chaos, 0.1, 50, d.cheapSplinters.chaos) },
    msBoots: { on: on(p?.msBoots) },
    hideRgb: { on: on(p?.hideRgb) },
    vendorQuality: { on: on(p?.vendorQuality) },
    volume: { on: on(p?.volume), percent: Math.round(num(p?.volume?.percent, 5, 100, d.volume.percent)) },
    beams: { on: on(p?.beams), keepTiers: Math.round(num(p?.beams?.keepTiers, 1, 5, d.beams.keepTiers)) },
    weapons: { on: on(p?.weapons), archetype: ARCHETYPES.some(a => a.key === p?.weapons?.archetype) ? p!.weapons!.archetype : d.weapons.archetype }
  }
}

export const RECIPE_SLOTS = [
  { key: 'body', label: 'Body armours', classes: ['Body Armours'], colour: [255, 80, 80] },
  { key: 'helmet', label: 'Helmets', classes: ['Helmets'], colour: [255, 170, 60] },
  { key: 'gloves', label: 'Gloves', classes: ['Gloves'], colour: [240, 230, 80] },
  { key: 'boots', label: 'Boots', classes: ['Boots'], colour: [90, 220, 90] },
  { key: 'belt', label: 'Belts', classes: ['Belts'], colour: [80, 210, 230] },
  { key: 'amulet', label: 'Amulets', classes: ['Amulets'], colour: [110, 140, 255] },
  { key: 'ring', label: 'Rings', classes: ['Rings'], colour: [200, 110, 255] },
  // Small one-handers fit the stash; two of them make the weapon slot.
  { key: 'weapon', label: 'Small weapons', classes: ['Daggers', 'Rune Daggers', 'Wands', 'Sceptres', 'Claws', 'One Hand Maces'], colour: [230, 230, 230] }
] as const

// Below this, you're still in the campaign.
const MAPS_FROM = 68
// A tier N map is area level 67 + N.
const MAP_LEVEL_BASE = 67

// Currency bases cheaper than the line, from the filter's own currency rules.
export function cheapCurrencyBases (doc: FilterDoc, lookup: PriceLookup, chaos: number): string[] {
  const group = ECONOMY_GROUPS.find(g => g.type === 'currency')!
  const out = new Set<string>()
  for (const b of doc.blocks) {
    if (b.disabled || b.type !== 'currency') continue
    const list = b.conditions.find(c => c.key === 'BaseType' && c.op === '==')
    for (const base of list?.values ?? []) {
      const p = lookup(group, base)
      if (p && !p.thin && p.chaos < chaos) out.add(base)
    }
  }
  return [...out].sort((a, z) => a.localeCompare(z))
}

// Stack sizes a price rule is cut into. Each base goes to the largest size at
// or below where its stack reaches the line, so a stack worth the line never
// hides; a little more than that may stay shown.
const STACK_STEPS = [2, 3, 4, 5, 10, 20, 50, 100, 200, 500, 1000]

// Bases cheaper than `chaos` a piece, by the stack size from which they show.
export function cheapStacks (bases: Iterable<string>, price: (base: string) => { chaos: number, thin: boolean } | null, chaos: number): Map<number, string[]> {
  const out = new Map<number, string[]>()
  for (const base of new Set(bases)) {
    const p = price(base)
    if (!p || p.thin || !(p.chaos < chaos)) continue
    const need = p.chaos > 0 ? Math.ceil(chaos / p.chaos) : Infinity
    const step = STACK_STEPS.filter(s => s <= need).pop()
    if (step == null) continue
    out.set(step, [...(out.get(step) ?? []), base])
  }
  for (const list of out.values()) list.sort((a, z) => a.localeCompare(z))
  return new Map([...out].sort(([a], [z]) => a - z))
}

function listedBases (doc: FilterDoc, keep: (b: FilterBlock) => boolean, name: (base: string) => boolean = () => true): string[] {
  const out = new Set<string>()
  for (const b of doc.blocks) {
    if (b.type?.startsWith('woke->') || !keep(b)) continue
    for (const c of b.conditions) {
      if (c.key === 'BaseType' && c.op === '==') c.values.filter(name).forEach(v => out.add(v))
    }
  }
  return [...out]
}

const groupOf = (type: string) => ECONOMY_GROUPS.find(g => g.type === type)!

// Divination cards cheaper than the line, from the filter's own card rules.
export function cheapCards (doc: FilterDoc, lookup: PriceLookup, chaos: number): Map<number, string[]> {
  const group = groupOf('divination')
  return cheapStacks(listedBases(doc, b => b.type === 'divination'), base => lookup(group, base), chaos)
}

const SPLINTER = /\b(Splinter|Shard)\b/
// Splinters and shards cheaper than the line, priced as currency or fragments.
export function cheapSplinters (doc: FilterDoc, lookup: PriceLookup, chaos: number): Map<number, string[]> {
  const groups = [groupOf('currency'), groupOf('fragments')]
  return cheapStacks(listedBases(doc, () => true, base => SPLINTER.test(base)), base => {
    for (const g of groups) {
      const p = lookup(g, base)
      if (p) return p
    }
    return null
  }, chaos)
}

export type UniqueBreakdown = (group: EconomyGroup, base: string) => Array<{ name: string, chaos: number | null, thin: boolean }>

// Unique bases where every unique (priced, not thin) is under the line.
export function cheapUniqueBases (doc: FilterDoc, breakdown: UniqueBreakdown, chaos: number, keep: Iterable<string> = []): string[] {
  const group = groupOf('uniques')
  const kept = new Set(keep)
  return listedBases(doc, b => b.type === 'uniques').filter(base => {
    if (kept.has(base)) return false
    const rows = breakdown(group, base)
    return rows.length > 0 && rows.every(r => r.chaos != null && !r.thin && r.chaos < chaos)
  }).sort((a, z) => a.localeCompare(z))
}

// Bases NeverSink's dust tiers list (shipped switched off).
export function neverSinkDustBases (doc: FilterDoc): string[] {
  return listedBases({ ...doc, blocks: doc.blocks.filter(isNeverSinkDustTier) }, () => true)
}

export function archetypeClasses (p: Presets, buildWeapons: string[] | null): string[] | null {
  if (p.weapons.archetype === 'auto') return buildWeapons?.length ? buildWeapons : null
  return ARCHETYPES.find(a => a.key === p.weapons.archetype)!.classes
}

const FLASK_CLASSES = ['Life Flasks', 'Mana Flasks', 'Hybrid Flasks', 'Utility Flasks']
const MS_PREFIXES = ["Runner's", "Sprinter's", "Stallion's", "Gazelle's", "Cheetah's", "Hellion's"]
// The vendor rules show up to this area level (the white and yellow maps).
const EARLY_MAPS_TO = 77

const cond = (key: string, op: string, values: Array<string | number>) => ({ key, op, count: null, values: values.map(String) })

function look (b: FilterBlock, rgb: readonly number[], size: number): FilterBlock {
  b.actions = [
    { key: 'SetFontSize', args: [String(size)] },
    { key: 'SetTextColor', args: [...rgb.map(String), '255'] },
    { key: 'SetBorderColor', args: [...rgb.map(String), '255'] },
    { key: 'SetBackgroundColor', args: ['20', '20', '20', '230'] }
  ]
  return b
}

// NeverSink's look for its dust tiers, so both rules look alike.
const DUST_LOOK = [
  { key: 'SetFontSize', args: ['45'] },
  { key: 'SetTextColor', args: ['175', '96', '37', '255'] },
  { key: 'SetBorderColor', args: ['175', '96', '37', '255'] },
  { key: 'SetBackgroundColor', args: ['10', '30', '45', '255'] },
  { key: 'PlayEffect', args: ['Purple'] },
  { key: 'MinimapIcon', args: ['1', 'Purple', 'Star'] }
]

export interface PresetContext {
  // Every unique on a base with its price (prices.ts breakdown).
  breakdown?: UniqueBreakdown | null
  // From the active PoB build.
  build?: { uniqueBases: string[], weaponClasses: string[] } | null
}

// Rules the presets add at the top, highest first. `dustBases` is the list
// from today's prices (disenchant/calc.ts dustBases), or null without prices.
export function presetBlocks (doc: FilterDoc, p: Presets, lookup: PriceLookup | null, dustBases: string[] | null = null, ctx: PresetContext = {}): FilterBlock[] {
  const out: FilterBlock[] = []
  const levelling = cond('AreaLevel', '<', [MAPS_FROM])
  const inMaps = cond('AreaLevel', '>=', [MAPS_FROM])
  if (p.dust.on && p.dust.fromPrices && dustBases?.length) {
    const b = addedBlock(PRESET_TYPE, 'dust', `uniques worth ${p.dust.line} dust per chaos or more`, [
      { key: 'Rarity', op: '==', count: null, values: ['Unique'] },
      { key: 'Replica', op: '', count: null, values: ['False'] },
      { key: 'Foulborn', op: '', count: null, values: ['False'] },
      { key: 'ItemLevel', op: '>=', count: null, values: [String(DUST_ILVL)] },
      { key: 'BaseType', op: '==', count: null, values: dustBases }
    ], 'Show', 'Presets')
    b.actions = DUST_LOOK.map(a => ({ key: a.key, args: [...a.args] }))
    out.push(b)
  }
  if (p.sixSockets.on) {
    out.push(look(addedBlock(PRESET_TYPE, 'sixsockets', '6-socket items for the vendor', [
      { key: 'Sockets', op: '>=', count: null, values: ['6'] },
      { key: 'Rarity', op: '<=', count: null, values: ['Rare'] }
    ], 'Show', 'Presets'), [200, 200, 200], 38))
  }
  if (p.chaosRecipe.on) {
    for (const slot of RECIPE_SLOTS) {
      if (!p.chaosRecipe.slots.includes(slot.key)) continue
      const conditions = [
        { key: 'Rarity', op: '==', count: null, values: ['Rare'] },
        { key: 'Identified', op: '', count: null, values: ['False'] },
        { key: 'ItemLevel', op: '>=', count: null, values: ['60'] },
        { key: 'ItemLevel', op: '<=', count: null, values: ['74'] },
        { key: 'Class', op: '==', count: null, values: [...slot.classes] }
      ]
      if (slot.key === 'weapon') conditions.push({ key: 'Height', op: '<=', count: null, values: ['3'] })
      out.push(look(addedBlock(PRESET_TYPE, `recipe${slot.key}`, `chaos recipe: ${slot.label.toLowerCase()}`, conditions, 'Show', 'Presets'), slot.colour, 36))
    }
  }
  if (p.msBoots.on) {
    const b = addedBlock(PRESET_TYPE, 'msboots', 'boots with movement speed while levelling', [
      levelling,
      cond('Rarity', '', ['Magic', 'Rare']),
      cond('Class', '==', ['Boots']),
      cond('HasExplicitMod', '', MS_PREFIXES)
    ], 'Show', 'Presets')
    b.actions = [
      { key: 'SetFontSize', args: ['42'] },
      { key: 'SetBorderColor', args: ['0', '255', '200', '255'] },
      { key: 'SetBackgroundColor', args: ['0', '40', '35', '240'] },
      { key: 'PlayAlertSound', args: ['2', '300'] },
      { key: 'PlayEffect', args: ['Cyan', 'Temp'] },
      { key: 'MinimapIcon', args: ['2', 'Cyan', 'Kite'] }
    ]
    out.push(b)
  }
  if (p.vendorQuality.on) {
    // Gems get theirs next to NeverSink's quality gem tier (applyPresetChanges),
    // so its exceptional and special gems keep their look.
    out.push(look(addedBlock(PRESET_TYPE, 'vendorflasks', '20% quality flasks for the vendor', [
      cond('AreaLevel', '<=', [EARLY_MAPS_TO]),
      cond('Quality', '>=', [20]),
      // NeverSink's own endgame flask tiers start at item level 82.
      cond('ItemLevel', '<', [82]),
      cond('Rarity', '', ['Normal', 'Magic']),
      cond('Class', '==', FLASK_CLASSES)
    ], 'Show', 'Presets'), [120, 220, 255], 38))
  }
  if (p.weapons.on) {
    const keep = archetypeClasses(p, ctx.build?.weaponClasses ?? null)
    const others = keep ? WEAPON_CLASSES.filter(c => !keep.includes(c)) : []
    if (others.length) {
      out.push(addedBlock(PRESET_TYPE, 'otherweapons', 'white and blue weapons for other builds while levelling', [
        levelling,
        cond('Rarity', '', ['Normal', 'Magic']),
        cond('Class', '==', others)
      ], 'Hide', 'Presets'))
      const dim = addedBlock(PRESET_TYPE, 'otherweaponsrare', 'rare weapons for other builds, dimmed, while levelling', [
        levelling,
        cond('Rarity', '', ['Rare']),
        cond('Class', '==', others)
      ], 'Show', 'Presets')
      dim.actions = [
        { key: 'SetFontSize', args: ['26'] },
        { key: 'SetBorderColor', args: ['0', '0', '0', '0'] },
        { key: 'SetBackgroundColor', args: ['0', '0', '0', '150'] },
        { key: 'DisableDropSound', args: ['True'] }
      ]
      out.push(dim)
    }
  }
  if (p.cheapCurrency.on && lookup) {
    const bases = cheapCurrencyBases(doc, lookup, p.cheapCurrency.chaos)
    if (bases.length) {
      out.push(addedBlock(PRESET_TYPE, 'cheapcurrency', `currency under ${p.cheapCurrency.chaos}c once in maps`, [
        inMaps,
        { key: 'Class', op: '==', count: null, values: ['Stackable Currency'] },
        { key: 'BaseType', op: '==', count: null, values: bases }
      ], 'Hide', 'Presets'))
    }
  }
  const stackRules = (tier: string, note: string, groups: Map<number, string[]>, area: typeof inMaps | null) => {
    for (const [size, bases] of groups) {
      out.push(addedBlock(PRESET_TYPE, `${tier}${size}`, `${note}, in stacks under ${size}`, [
        ...(area ? [area] : []),
        cond('StackSize', '<', [size]),
        cond('BaseType', '==', bases)
      ], 'Hide', 'Presets'))
    }
  }
  if (p.cheapCards.on && lookup) {
    stackRules('cheapcards', `divination cards under ${p.cheapCards.chaos}c`, cheapCards(doc, lookup, p.cheapCards.chaos), null)
  }
  if (p.cheapSplinters.on && lookup) {
    stackRules('cheapsplinters', `splinters and shards under ${p.cheapSplinters.chaos}c once in maps`, cheapSplinters(doc, lookup, p.cheapSplinters.chaos), inMaps)
  }
  if (p.cheapUniques.on && ctx.breakdown) {
    // Bases a dust rule or your build shows stay shown.
    const keep = [
      ...(p.dust.on ? neverSinkDustBases(doc) : []),
      ...(p.dust.on && p.dust.fromPrices ? dustBases ?? [] : []),
      ...(ctx.build?.uniqueBases ?? [])
    ]
    const bases = cheapUniqueBases(doc, ctx.breakdown, p.cheapUniques.chaos, keep)
    if (bases.length) {
      // Only plain copies: NeverSink's rules for 5-links, 6-sockets,
      // corrupted, synthesised, replica and foulborn uniques still decide those.
      out.push(addedBlock(PRESET_TYPE, 'cheapuniques', `uniques under ${p.cheapUniques.chaos}c once in maps`, [
        inMaps,
        cond('Rarity', '', ['Unique']),
        cond('Replica', '', ['False']),
        cond('Foulborn', '', ['False']),
        cond('Corrupted', '', ['False']),
        cond('SynthesisedItem', '', ['False']),
        cond('LinkedSockets', '<', [5]),
        cond('Sockets', '<', [6]),
        cond('BaseType', '==', bases)
      ], 'Hide', 'Presets'))
    }
  }
  if (p.hideFlasks.on) {
    out.push(addedBlock(PRESET_TYPE, 'hideflasks', 'flasks under 20% quality once in maps', [
      inMaps,
      cond('Quality', '<', [20]),
      cond('Rarity', '', ['Normal', 'Magic']),
      cond('Class', '==', FLASK_CLASSES)
    ], 'Hide', 'Presets'))
  }
  return out
}

// Red-green safe swaps for beam and minimap colours.
const COLOUR_BLIND: Record<string, string> = { Green: 'Blue', Brown: 'Yellow', Red: 'Orange', Pink: 'Purple' }

// Returns true when it changed a colour.
export function colourBlindActions (b: FilterBlock): boolean {
  let touched = false
  b.actions = b.actions.map(a => {
    if ((a.key === 'PlayEffect' && COLOUR_BLIND[a.args[0]]) || (a.key === 'MinimapIcon' && COLOUR_BLIND[a.args[1]])) {
      touched = true
      const args = [...a.args]
      const i = a.key === 'PlayEffect' ? 0 : 1
      args[i] = COLOUR_BLIND[args[i]]
      return { key: a.key, args }
    }
    return a
  })
  return touched
}
const SOUND_KEYS = ['PlayAlertSound', 'PlayAlertSoundPositional', 'CustomAlertSound', 'CustomAlertSoundOptional']

function tierNumber (tier: string | null): number | null {
  const m = /^t(\d+)/.exec(tier ?? '')
  return m ? Number(m[1]) : null
}

// The highest map tier a block can catch, or null when it has no cap.
export function mapTierCap (b: FilterBlock): number | null {
  let cap: number | null = null
  for (const c of b.conditions) {
    if (c.key !== 'MapTier') continue
    const n = Math.max(...c.values.map(Number))
    if (!Number.isFinite(n)) return null
    const top = c.op === '<' ? n - 1 : ['', '=', '==', '<='].includes(c.op) ? n : null
    if (top != null) cap = cap == null ? top : Math.min(cap, top)
  }
  return cap
}

const minAreaLevel = (b: FilterBlock) => Math.max(0, ...b.conditions
  .filter(c => c.key === 'AreaLevel' && (c.op === '>=' || c.op === '>'))
  .map(c => Number(c.values[0]) + (c.op === '>' ? 1 : 0)))
const isRgbTier = (b: FilterBlock) => /^rgb/.test(b.tier ?? '') && /^(socketslinks|endgamergb|leveling->normalmagic->rgb)$/.test(b.type ?? '')
// NeverSink's white and blue rules in maps that the gear preset narrows to rares.
// Of the crafting bases, only NeverSink's lowest tier below item level 86,
// and never jewellery.
const JEWELLERY = / (Ring|Amulet|Belt|Talisman|Sash|Vise)$/
const isEarlyMapGear = (b: FilterBlock) => b.type === 'normalcraft->extra' ||
  (b.type === 'crafting->generalgear' && /^t3_/.test(b.tier ?? '') &&
    b.conditions.some(c => c.key === 'ItemLevel' && c.op === '>=' && Number(c.values[0]) < 86) &&
    !b.conditions.some(c => c.key === 'BaseType' && c.values.some(v => JEWELLERY.test(v))))

// Drops Normal and Magic from a block's Rarity. False when nothing is left.
function onlyRares (b: FilterBlock): boolean | null {
  const at = b.conditions.findIndex(c => c.key === 'Rarity' && (c.op === '' || c.op === '=' || c.op === '=='))
  if (at < 0) return null
  const c = b.conditions[at]
  const left = c.values.filter(v => v !== 'Normal' && v !== 'Magic')
  if (left.length === c.values.length) return null
  b.conditions[at] = { ...c, values: left }
  return left.length > 0
}

// NeverSink's 20% quality gem tier: the vendor rule goes right above it.
const isQualityGemTier = (b: FilterBlock) => b.type === 'gems->generic' && !b.continue &&
  b.conditions.some(c => c.key === 'Quality' && c.op === '>=' && Number(c.values[0]) === 20)

function insertBefore (doc: FilterDoc, anchor: FilterBlock, block: FilterBlock): void {
  const at = doc.chunks.indexOf(anchor)
  if (at < 0) return
  doc.chunks.splice(at, 0, block)
  block.line = anchor.line
  doc.blocks.splice(doc.blocks.indexOf(anchor), 0, block)
  doc.blocks.forEach((b, i) => { b.index = i })
}

// Hidden without a sound, beam or icon of its own.
function hideBlock (b: FilterBlock): void {
  b.visibility = 'Hide'
  b.actions = b.actions.filter(a => !SOUND_KEYS.includes(a.key) && !BEAM_KEYS.includes(a.key) && a.key !== 'DisableDropSound')
  b.actions.push({ key: 'DisableDropSound', args: ['True'] })
}

const VOLUME_KEYS = ['PlayAlertSound', 'PlayAlertSoundPositional']
const BEAM_KEYS = ['PlayEffect', 'MinimapIcon']

// Adjusts NeverSink's rules in place. Returns how many rules changed.
export function applyPresetChanges (doc: FilterDoc, p: Presets): number {
  let changed = 0
  for (const b of doc.blocks) {
    // NeverSink ships its dust tiers commented out.
    let touched = false
    if (p.dust.on && b.disabled && isNeverSinkDustTier(b)) {
      b.disabled = false
      touched = true
    }
    if (b.disabled || b.type === RULE_TYPE) continue
    // Volume follows every drop sound but your own rules': build rules and
    // the presets' own too.
    if (p.volume.on && p.volume.percent < 100) {
      b.actions = b.actions.map(a => {
        if (!VOLUME_KEYS.includes(a.key) || a.args[1] == null || !Number.isFinite(Number(a.args[1]))) return a
        touched = true
        return { key: a.key, args: [a.args[0], String(Math.max(1, Math.round(Number(a.args[1]) * p.volume.percent / 100))), ...a.args.slice(2)] }
      })
    }
    if (b.type?.startsWith('woke->')) {
      if (touched) { b.dirty = true; changed++ }
      continue
    }
    if (p.quiet.on) {
      const n = tierNumber(b.tier)
      if (n != null && n > p.quiet.keepTiers && b.actions.some(a => SOUND_KEYS.includes(a.key))) {
        b.actions = b.actions.filter(a => !SOUND_KEYS.includes(a.key))
        touched = true
      }
    }
    if (p.beams.on) {
      const n = tierNumber(b.tier)
      if (n != null && n > p.beams.keepTiers && b.actions.some(a => BEAM_KEYS.includes(a.key))) {
        b.actions = b.actions.filter(a => !BEAM_KEYS.includes(a.key))
        touched = true
      }
    }
    if (p.hideGear.on) {
      // The catch-all for white and blue gear in maps.
      if (b.type === 'hidelayer' && b.tier === 'normalmagicendgame' && b.visibility !== 'Hide') {
        hideBlock(b)
        touched = true
      } else if (isEarlyMapGear(b) && b.visibility !== 'Hide') {
        const left = onlyRares(b)
        if (left === false) hideBlock(b)
        if (left != null) touched = true
      }
    }
    if (p.hideRgb.on && isRgbTier(b) && b.visibility !== 'Hide') {
      // Rules for maps only stop; the rest keep working while levelling.
      if (minAreaLevel(b) >= MAPS_FROM) hideBlock(b)
      else b.conditions = [...b.conditions, cond('AreaLevel', '<', [MAPS_FROM])]
      touched = true
    }
    if (p.lowMaps.on && b.type === 'maps' && !b.continue && b.visibility !== 'Hide') {
      const cap = mapTierCap(b)
      if (cap != null && cap < p.lowMaps.tier) {
        // A map above the zone you're in is progress (NeverSink's map-up
        // rule marks it): that one falls through and still shows.
        hideBlock(b)
        b.conditions = [...b.conditions, cond('HasInfluence', '', ['None']), cond('AreaLevel', '>=', [MAP_LEVEL_BASE + cap])]
        touched = true
      }
    }
    if (p.bigger.on && b.visibility !== 'Hide') {
      const at = b.actions.findIndex(a => a.key === 'SetFontSize')
      const size = at >= 0 ? Number(b.actions[at].args[0]) : 32
      if (size < p.bigger.size) {
        if (at >= 0) b.actions[at] = { key: 'SetFontSize', args: [String(p.bigger.size)] }
        else b.actions = [{ key: 'SetFontSize', args: [String(p.bigger.size)] }, ...b.actions]
        touched = true
      }
    }
    if (p.colourBlind.on && colourBlindActions(b)) touched = true
    if (touched) { b.dirty = true; changed++ }
  }
  // Stricter files ship that tier switched off; it still marks the place.
  const gemAnchor = p.vendorQuality.on ? doc.blocks.find(isQualityGemTier) : undefined
  if (gemAnchor) {
    const b = look(addedBlock(PRESET_TYPE, 'vendorgems', '20% quality gems for the vendor', [
      cond('AreaLevel', '<=', [EARLY_MAPS_TO]),
      cond('Quality', '>=', [20]),
      cond('Class', '==', ['Skill Gems', 'Support Gems'])
    ], 'Show', 'Presets'), [120, 220, 255], 40)
    if (p.volume.on && p.volume.percent < 100) b.actions.push({ key: 'PlayAlertSound', args: ['2', String(Math.max(1, Math.round(300 * p.volume.percent / 100)))] })
    else b.actions.push({ key: 'PlayAlertSound', args: ['2', '300'] })
    insertBefore(doc, gemAnchor, b)
    changed++
  }
  return changed
}

export function presetsOn (p: Presets): boolean {
  return Object.values(p).some(v => v.on)
}
