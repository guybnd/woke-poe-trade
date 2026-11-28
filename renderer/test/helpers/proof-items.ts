// NeverSink retirement M8 (WOKEPOET-721): a broad sample of real items, and
// one item made from every rule of NeverSink's file, for the proof that our
// own filter (no NeverSink rules underneath) handles each item class the way
// NeverSink would, or better. See filter-own-proof.test.ts.
import fs from 'fs'
import path from 'path'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import type { FilterBlock, FilterCondition } from '@/web/woke/loot-filter/parse'
import { BASE_FACTS } from '@/web/woke/loot-filter/base-facts'
import { facts } from './filter-guard'

const DATA = path.join(__dirname, '../../public/data')
const LISTS = path.join(__dirname, '../../src/web/woke/loot-filter/item-lists.json')

export interface ProofItem {
  // Where it came from and what it is, for the report.
  label: string
  // The item class the report groups by.
  group: string
  // A name a price table uses for it (the unique's own name for uniques).
  priceName: string
  facts: ItemFacts
}

interface AppItem { name: string, refName: string, namespace: string, craftable?: { category?: string }, unique?: { base: string }, gem?: { transfigured?: boolean, normalVariant?: string } }

let appItems: AppItem[] | null = null
function items (): AppItem[] {
  appItems ??= fs.readFileSync(path.join(DATA, 'en/items.ndjson'), 'utf8').trim().split('\n').map(l => JSON.parse(l) as AppItem)
  return appItems
}

const THRUSTING = /Spike$|Rapier$|Foil$|^Smallsword$|^Estoc$|^Pecoraro$|^Courtesan Sword$|^Dragoon Sword$/

// The app data's craft category as the game's item class.
function classOf (category: string, name: string): string | null {
  switch (category) {
    case 'Bow': return 'Bows'
    case 'Claw': return 'Claws'
    case 'Dagger': return 'Daggers'
    case 'Rune Dagger': return 'Rune Daggers'
    case 'One-Handed Axe': return 'One Hand Axes'
    case 'One-Handed Mace': return 'One Hand Maces'
    case 'One-Handed Sword': return THRUSTING.test(name) ? 'Thrusting One Hand Swords' : 'One Hand Swords'
    case 'Sceptre': return 'Sceptres'
    case 'Staff': return 'Staves'
    case 'Warstaff': return 'Warstaves'
    case 'Two-Handed Axe': return 'Two Hand Axes'
    case 'Two-Handed Mace': return 'Two Hand Maces'
    case 'Two-Handed Sword': return 'Two Hand Swords'
    case 'Wand': return 'Wands'
    case 'Body Armour': return 'Body Armours'
    case 'Helmet': return 'Helmets'
    case 'Gloves': return 'Gloves'
    case 'Boots': return 'Boots'
    case 'Shield': return 'Shields'
    case 'Quiver': return 'Quivers'
    case 'Ring': return 'Rings'
    case 'Amulet': return 'Amulets'
    case 'Belt': return 'Belts'
    case 'Jewel': return 'Jewels'
    case 'Cluster Jewel': return 'Jewels'
    case 'Abyss Jewel': return 'Abyss Jewels'
    case 'Tincture': return 'Tinctures'
    case 'Flask': return /Life Flask$/.test(name) ? 'Life Flasks' : /Mana Flask$/.test(name) ? 'Mana Flasks' : /Hybrid Flask$/.test(name) ? 'Hybrid Flasks' : 'Utility Flasks'
    case 'Heist Tool': return 'Heist Tools'
    case 'Heist Gear': return 'Heist Gear'
    case 'Heist Cloak': return 'Heist Cloaks'
    case 'Heist Brooch': return 'Heist Brooches'
    case 'Heist Contract': return 'Contracts'
    case 'Heist Blueprint': return 'Blueprints'
    case 'Idol': return 'Idols'
    case 'Sanctum Relic': return 'Relics'
    case 'Viscera': return 'Viscera'
    case 'Trinket': return 'Trinkets'
    case 'Fishing Rod': return 'Fishing Rods'
    case 'Expedition Logbook': return 'Expedition Logbooks'
    case 'Chart': return 'Chart'
    case 'Invitation': return 'Misc Map Items'
    default: return null
  }
}

const GEAR = new Set(['Bows', 'Claws', 'Daggers', 'Rune Daggers', 'One Hand Axes', 'One Hand Maces', 'One Hand Swords', 'Thrusting One Hand Swords', 'Sceptres', 'Staves', 'Warstaves', 'Two Hand Axes', 'Two Hand Maces', 'Two Hand Swords', 'Wands', 'Body Armours', 'Helmets', 'Gloves', 'Boots', 'Shields', 'Quivers', 'Rings', 'Amulets', 'Belts'])
export const isGearClass = (cls: string | undefined) => cls != null && GEAR.has(cls)

// Base name -> item class, from the app's item data and our own item lists.
let classes: Map<string, string> | null = null
export function baseClasses (): Map<string, string> {
  if (classes) return classes
  classes = new Map()
  const lists = JSON.parse(fs.readFileSync(LISTS, 'utf8')) as { classes: string[], items: Array<[string, number, string]> }
  for (const [name, cls] of lists.items) classes.set(name, lists.classes[cls])
  for (const i of items()) {
    if (i.namespace !== 'ITEM' || !i.craftable?.category) continue
    const cls = classOf(i.craftable.category, i.refName)
    if (cls && !classes.has(i.refName)) classes.set(i.refName, cls)
  }
  return classes
}

const size = (base: string): Partial<ItemFacts> => {
  const f = BASE_FACTS[base]
  return f ? { dropLevel: f[0], width: f[1], height: f[2] } : {}
}

// Every base, unique, gem, map and stackable the game data knows, as drops.
export function catalog (areaLevel: number): ProofItem[] {
  const out: ProofItem[] = []
  const push = (label: string, group: string, priceName: string, f: Partial<ItemFacts>) =>
    out.push({ label, group, priceName, facts: facts({ areaLevel, itemLevel: Math.max(1, Math.min(86, areaLevel + 1)), ...f }) })
  const cls = baseClasses()
  for (const [base, c] of cls) {
    if (isGearClass(c)) {
      const s = size(base)
      push(`${base} (normal)`, c, base, { itemClass: c, baseType: base, rarity: 'Normal', ...s })
      push(`${base} (magic)`, c, base, { itemClass: c, baseType: base, rarity: 'Magic', identified: false, ...s })
      push(`${base} (rare, unid)`, c, base, { itemClass: c, baseType: base, rarity: 'Rare', identified: false, ...s })
      push(`${base} (rare, ilvl 86 Shaper)`, c, base, { itemClass: c, baseType: base, rarity: 'Rare', identified: false, itemLevel: 86, influences: ['Shaper'], ...s })
      continue
    }
    if (/Flasks$|^Tinctures$/.test(c)) {
      const s = size(base)
      push(`${base} (normal)`, c, base, { itemClass: c, baseType: base, rarity: 'Normal', ...s })
      push(`${base} (20% quality)`, c, base, { itemClass: c, baseType: base, rarity: 'Normal', quality: 20, ...s })
      push(`${base} (magic)`, c, base, { itemClass: c, baseType: base, rarity: 'Magic', ...s })
      continue
    }
    if (c === 'Jewels' || c === 'Abyss Jewels') {
      if (/Cluster Jewel$/.test(base)) {
        for (const n of /^Large/.test(base) ? [8, 12] : /^Medium/.test(base) ? [4, 6] : [2, 3]) {
          push(`${base} (${n} passives, rare)`, c, base, { itemClass: c, baseType: base, rarity: 'Rare', identified: false, itemLevel: 84, enchantmentPassiveNum: n, anyEnchantment: true, enchantPassiveNodes: ['12% increased Fire Damage'], enchantments: [`Adds ${n} Passive Skills`] })
        }
        continue
      }
      push(`${base} (magic)`, c, base, { itemClass: c, baseType: base, rarity: 'Magic', identified: false })
      push(`${base} (rare)`, c, base, { itemClass: c, baseType: base, rarity: 'Rare', identified: false })
      continue
    }
    // Stackables and the rest: one of each.
    push(base, c, base, { itemClass: c, baseType: base, rarity: 'Normal', stackSize: 1, ...size(base) })
  }
  for (const i of items()) {
    if (i.namespace === 'UNIQUE' && i.unique?.base) {
      const base = i.unique.base
      const c = cls.get(base) ?? (/^Map/.test(base) ? 'Maps' : null)
      if (!c) continue
      push(`${i.name} (unique ${base})`, `Uniques: ${c}`, i.name, { itemClass: c, baseType: c === 'Maps' ? 'Map (Tier 16)' : base, rarity: 'Unique', identified: false, mapTier: c === 'Maps' ? 16 : undefined, ...size(base) })
    }
    if (i.namespace === 'GEM') {
      const support = / Support$/.test(i.refName)
      const c = support ? 'Support Gems' : 'Skill Gems'
      const t = i.gem?.transfigured === true
      const g = { itemClass: c, baseType: i.refName, filterBase: t ? i.gem?.normalVariant : undefined, transfigured: t, rarity: 'Normal' as const, width: 1, height: 1 }
      push(`${i.refName} 20/0`, c, i.refName, { ...g, gemLevel: 20, quality: 0 })
      push(`${i.refName} 1/20`, c, i.refName, { ...g, gemLevel: 1, quality: 20 })
      push(`${i.refName} 1/0`, c, i.refName, { ...g, gemLevel: 1, quality: 0 })
    }
  }
  // Maps: every tier, white, magic and rare, plus blighted.
  for (let t = 1; t <= 17; t++) {
    for (const rarity of ['Normal', 'Magic', 'Rare'] as const) {
      push(`Map T${t} (${rarity.toLowerCase()})`, 'Maps', `Map (Tier ${t})`, { itemClass: 'Maps', baseType: `Map (Tier ${t})`, rarity, mapTier: t, width: 1, height: 1 })
    }
    push(`Blighted Map T${t}`, 'Maps', `Blighted Map (Tier ${t})`, { itemClass: 'Maps', baseType: `Map (Tier ${t})`, rarity: 'Normal', mapTier: t, blightedMap: true, width: 1, height: 1 })
  }
  // Links and sockets, the gear NeverSink beams for.
  for (const [base, c] of [['Astral Plate', 'Body Armours'], ['Vaal Regalia', 'Body Armours'], ['Imperial Bow', 'Bows']]) {
    push(`${base} 6-link (normal)`, '6-links and 6-sockets', base, { itemClass: c, baseType: base, rarity: 'Normal', socketGroups: ['RGBRGB'], ...size(base) })
    push(`${base} 6 sockets (normal)`, '6-links and 6-sockets', base, { itemClass: c, baseType: base, rarity: 'Normal', socketGroups: ['RG', 'BR', 'GB'], ...size(base) })
    push(`${base} 5-link (rare)`, '6-links and 6-sockets', base, { itemClass: c, baseType: base, rarity: 'Rare', identified: false, socketGroups: ['RGBRG'], ...size(base) })
  }
  return out
}

// ---- An item for each of NeverSink's rules ----

const RARITY = ['Normal', 'Magic', 'Rare', 'Unique'] as const
const NUMERIC: Partial<Record<string, keyof ItemFacts>> = {
  ItemLevel: 'itemLevel',
  DropLevel: 'dropLevel',
  Quality: 'quality',
  AreaLevel: 'areaLevel',
  MapTier: 'mapTier',
  GemLevel: 'gemLevel',
  StackSize: 'stackSize',
  Width: 'width',
  Height: 'height',
  MemoryStrands: 'memoryStrands',
  CorruptedMods: 'corruptedMods',
  EnchantmentPassiveNum: 'enchantmentPassiveNum',
  HasSearingExarchImplicit: 'exarchTier',
  HasEaterOfWorldsImplicit: 'eaterTier',
  UnidentifiedItemTier: 'unidentifiedItemTier'
}
const BOOL: Partial<Record<string, keyof ItemFacts>> = {
  Identified: 'identified',
  Corrupted: 'corrupted',
  Mirrored: 'mirrored',
  FracturedItem: 'fractured',
  SynthesisedItem: 'synthesised',
  Replica: 'replica',
  Foulborn: 'foulborn',
  Fated: 'fated',
  Vestigial: 'vestigial',
  TransfiguredGem: 'transfigured',
  BlightedMap: 'blightedMap',
  UberBlightedMap: 'uberBlightedMap',
  Imbued: 'imbued',
  ZanaMemory: 'zanaMemory',
  Exceptional: 'exceptional',
  HasCruciblePassiveTree: 'crucibleTree',
  AnyEnchantment: 'anyEnchantment',
  HasImplicitMod: 'hasImplicitMod'
}

// The smallest value meeting every bound on one number, nearest `prefer`.
function pick (conds: FilterCondition[], prefer: number): number {
  let lo = -Infinity
  let hi = Infinity
  const eq: number[] = []
  const ne: number[] = []
  for (const c of conds) {
    const vs = c.values.map(Number).filter(v => !Number.isNaN(v))
    if (!vs.length) continue
    switch (c.op) {
      case '>=': lo = Math.max(lo, Math.min(...vs)); break
      case '>': lo = Math.max(lo, Math.min(...vs) + 1); break
      case '<=': hi = Math.min(hi, Math.max(...vs)); break
      case '<': hi = Math.min(hi, Math.max(...vs) - 1); break
      case '!=': case '!': ne.push(...vs); break
      default: eq.push(...vs)
    }
  }
  const ok = (v: number) => v >= lo && v <= hi && !ne.includes(v)
  const exact = eq.find(ok)
  if (exact != null) return exact
  let v = Math.max(lo, Math.min(hi, prefer))
  while (!ok(v) && v < hi) v++
  return v
}

// An item that meets every condition of the block, or null when one can't be
// met by facts (a condition the matcher doesn't know).
export function itemForBlock (b: FilterBlock): ItemFacts | null {
  const f: Partial<ItemFacts> = { influences: [], explicitModNames: [] }
  const by = new Map<string, FilterCondition[]>()
  for (const c of b.conditions) by.set(c.key, [...(by.get(c.key) ?? []), c])
  const cls = baseClasses()
  const classCond = by.get('Class')?.[0]
  const baseCond = by.get('BaseType')?.[0]
  if (baseCond && baseCond.op !== '!=' && baseCond.op !== '!') {
    const exact = baseCond.op === '=='
    const want = classCond?.values
    // A base the class allows, when the rule names both.
    const known = [...cls.entries()].filter(([n]) => baseCond.values.some(v => exact ? n === v : n.includes(v)))
    const fit = known.find(([, c]) => !want || want.some(w => classCond!.op === '==' ? c === w : c.includes(w)))
    if (fit) { f.baseType = fit[0]; f.itemClass = fit[1] } else f.baseType = baseCond.values[0]
  }
  if (classCond && f.itemClass == null) f.itemClass = classCond.values[0]
  if (f.itemClass == null && f.baseType) f.itemClass = cls.get(f.baseType)
  if (f.baseType == null) {
    // A class-only rule: any base of that class.
    const any = [...cls.entries()].find(([, c]) => c === f.itemClass)
    f.baseType = any?.[0] ?? f.itemClass ?? 'Unknown'
  }
  const bf = BASE_FACTS[f.baseType]
  if (bf) Object.assign(f, { dropLevel: bf[0], width: bf[1], height: bf[2] })
  f.rarity = 'Normal'
  for (const c of by.get('Rarity') ?? []) {
    const ok = RARITY.filter(r => {
      const a = RARITY.indexOf(r)
      if (c.op === '' || c.op === '=' || c.op === '==') return c.values.includes(r)
      if (c.op === '!=' || c.op === '!') return !c.values.includes(r)
      return c.values.some(v => { const e = RARITY.indexOf(v as typeof RARITY[number]); return c.op === '>=' ? a >= e : c.op === '>' ? a > e : c.op === '<=' ? a <= e : a < e })
    })
    f.rarity = ok.includes(f.rarity) ? f.rarity : ok[0] ?? f.rarity
  }
  const defaults: Partial<Record<string, number>> = { AreaLevel: 83, ItemLevel: 84, StackSize: 1, Quality: 0, CorruptedMods: 0, MemoryStrands: 0, MapTier: 16, GemLevel: 1 }
  for (const [key, field] of Object.entries(NUMERIC)) {
    const conds = by.get(key)
    if (!conds) continue
    ;(f as Record<string, unknown>)[field!] = pick(conds, defaults[key] ?? 0)
  }
  for (const [key, field] of Object.entries(BOOL)) {
    const c = by.get(key)?.[0]
    if (!c) continue
    const want = (c.values[0] ?? 'True').toLowerCase() === 'true'
    ;(f as Record<string, unknown>)[field!] = (c.op === '!=' || c.op === '!') ? !want : want
  }
  for (const c of by.get('HasInfluence') ?? []) if (!c.values.includes('None')) f.influences = c.op === '==' ? [...c.values] : [c.values[0]]
  if (by.get('ShaperItem')) f.influences = ['Shaper']
  if (by.get('ElderItem')) f.influences = [...(f.influences ?? []), 'Elder']
  for (const c of by.get('HasExplicitMod') ?? []) {
    if (c.op === '!=' || c.op === '!' || (c.count != null && (c.op === '<' || c.op === '<='))) continue
    const n = c.count != null ? (c.op === '>' ? c.count + 1 : c.count) : 1
    f.explicitModNames = [...(f.explicitModNames ?? []), ...Array.from({ length: n }, (_, i) => c.values[i % c.values.length])]
    f.identified = true
    // A white item has no mods: the rule means the magic or rare one.
    if (f.rarity === 'Normal' && !by.get('Rarity')?.some(r => (r.op === '' || r.op === '==') && !r.values.some(v => v !== 'Normal'))) f.rarity = n > 2 ? 'Rare' : 'Magic'
  }
  for (const c of by.get('HasEnchantment') ?? []) { f.enchantments = [c.values[0]]; f.anyEnchantment = true }
  for (const c of by.get('EnchantmentPassiveNode') ?? []) f.enchantPassiveNodes = [c.values[0]]
  // Sockets: one linked group as long as LinkedSockets / SocketGroup want,
  // loose sockets for the rest of Sockets.
  const linkConds = by.get('LinkedSockets')
  const groupCond = by.get('SocketGroup')?.[0]
  const sockCond = by.get('Sockets')?.[0]
  const spec = (c: FilterCondition | undefined) => {
    const m = c ? /^(\d*)([RGBWAD]*)$/i.exec(c.values[0] ?? '') : null
    return m ? { n: m[1] ? Number(m[1]) : 0, colours: m[2].toUpperCase() } : { n: 0, colours: '' }
  }
  const g = spec(groupCond)
  const s = spec(sockCond)
  let linked = Math.max(linkConds ? pick(linkConds, 0) : 0, g.n, g.colours.length)
  const total = Math.max(linked, s.n, s.colours.length)
  if (linked === 1) linked = 0
  if (total > 0) {
    const colours = (g.colours + s.colours + 'RGBRGB').slice(0, total)
    const groups = linked ? [colours.slice(0, linked)] : []
    for (const ch of colours.slice(linked)) groups.push(ch)
    f.socketGroups = groups
  }
  // Keys the matcher doesn't know can't be met by an item here.
  const known = new Set(['Class', 'BaseType', 'Rarity', 'LinkedSockets', 'Sockets', 'SocketGroup', 'HasInfluence', 'ShaperItem', 'ElderItem', 'HasExplicitMod', 'HasEnchantment', 'EnchantmentPassiveNode', ...Object.keys(NUMERIC), ...Object.keys(BOOL)])
  if (b.conditions.some(c => !known.has(c.key))) return null
  if (f.itemClass === 'Maps' && f.mapTier == null) f.mapTier = 16
  if (/Gem/.test(f.itemClass ?? '') && f.gemLevel == null) f.gemLevel = 1
  return facts(f)
}
