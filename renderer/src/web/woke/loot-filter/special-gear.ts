// Special gear on the Loot tab (NeverSink retirement M4b): our own rules for
// what NeverSink files as exotic mods, exotic item classes and variations,
// influenced gear, enshrouded items and idols. No price can judge these (a
// filter sees a mod's name, never its roll), so every row has a fixed step,
// near NeverSink's look, that you can change, or set By price on its section.
//
// They go where NeverSink's influenced rules start: under its 6-links and
// gold, and under the rare weights (which judge unidentified rares, marks
// for influence and fractured included). A row set Off writes nothing: the
// item is judged as any other gear below. In maps NeverSink's own copies of
// these rules stop (retireSpecial), so ours decide; while levelling they stay.
import type { LootCategory } from './fragment-classes'
import type { FilterBlock, FilterCondition, FilterDoc } from './parse'
import type { CStep, SectionMode } from './currency-settings'

export const SPECIAL_CATEGORIES: LootCategory[] = [
  { id: 'sgveil', name: 'Veiled mods', art: 'Vermillion Ring' },
  { id: 'sgmods', name: 'League mods', art: 'Two-Toned Boots' },
  { id: 'sgvar', name: 'Fractured, corrupted and enchanted', art: 'Onyx Amulet' },
  { id: 'sginfl', name: 'Influenced gear', art: 'Hubris Circlet' },
  { id: 'sgclass', name: 'Rare item kinds', art: 'Fishing Rod' },
  { id: 'sgshroud', name: 'Enshrouded items', art: 'Enshrouded Quiver' },
  { id: 'sgidol', name: 'Idols', art: 'Minor Idol' }
]
export const SPECIAL_IDS = new Set(SPECIAL_CATEGORIES.map(x => x.id))
// Every section starts Always: each row shows at its set look.
export const SPECIAL_MODES: Record<string, SectionMode> = Object.fromEntries(SPECIAL_CATEGORIES.map(x => [x.id, 'always' as SectionMode]))

// Gear keeps the hexagon (Equipment's shape); each section its own colour.
const look = (text: [number, number, number], color: string) => ({ text, color, shape: 'Hexagon' })
export const SPECIAL_LOOK: Record<string, { text: [number, number, number], color: string, shape: string }> = {
  sgveil: look([0, 240, 190], 'Cyan'),
  sgmods: look([130, 230, 150], 'Green'),
  sgvar: look([150, 190, 255], 'Blue'),
  sginfl: look([200, 160, 255], 'Purple'),
  sgclass: look([255, 170, 90], 'Orange'),
  sgshroud: look([230, 180, 120], 'Brown'),
  sgidol: look([255, 220, 110], 'Yellow')
}

export interface SpecialRow {
  cat: string
  // Unique among every Loot tab item: your edits are kept by name.
  name: string
  // The filter's Class ('' for any; several joined by '|') and BaseTypes
  // ([] for any). `tip`: the base its tooltip shows.
  cls: string
  bts: string[]
  tip: string
  // The price By price uses, and the step it shows at until you change it.
  guess: number
  fixed: CStep
  conds: FilterCondition[]
}

const cnd = (key: string, op: string, values: string[], count: number | null = null): FilterCondition => ({ key, op, count, values } as FilterCondition)
const T = (key: string) => cnd(key, '', ['True'])
const F = (key: string) => cnd(key, '', ['False'])
const RARE = cnd('Rarity', '', ['Rare'])
const MAGIC = cnd('Rarity', '', ['Magic'])
const NOT_UNIQUE = cnd('Rarity', '', ['Normal', 'Magic', 'Rare'])
const ID = T('Identified')
// Fractured, neither mirrored nor corrupted.
const CLEAN = [F('Mirrored'), F('Corrupted')]
const FRACT = [T('FracturedItem'), ...CLEAN]
const DOUBLE = [T('Corrupted'), cnd('CorruptedMods', '>=', ['2']), RARE]
const mod = (...names: string[]) => cnd('HasExplicitMod', '', names)
// Identified rares with one of these mods.
const idr = (...names: string[]) => [ID, RARE, mod(...names)]
const ilvl = (op: string, n: number) => cnd('ItemLevel', op, [String(n)])

const JEWELLERY = ['Amulets', 'Belts', 'Rings']
const ARMOUR = ['Body Armours', 'Boots', 'Gloves', 'Helmets', 'Shields', 'Quivers']
const WEAPONS = ['Bows', 'Claws', 'Daggers', 'One Hand Axes', 'One Hand Maces', 'One Hand Swords', 'Rune Daggers', 'Sceptres', 'Staves', 'Thrusting One Hand Swords', 'Two Hand Axes', 'Two Hand Maces', 'Two Hand Swords', 'Wands', 'Warstaves']
const GEAR = [...JEWELLERY, ...ARMOUR, ...WEAPONS]
const INCURSION = ['Citaqualotl', 'Guatelitzi', 'Matatl', 'Puhuarte', 'Tacati', 'Topotante', 'Xopec']
const INFLUENCES = ['Crusader', 'Elder', 'Hunter', 'Redeemer', 'Shaper', 'Warlord']
const INFL = cnd('HasInfluence', '', INFLUENCES)
const ENSHROUDED = ['Enshrouded Body Armour', 'Enshrouded Boots', 'Enshrouded Gloves', 'Enshrouded Helmet', 'Enshrouded Quiver', 'Enshrouded Shield']
const VOIDSTONES = ['Ceremonial Voidstone', 'Decayed Voidstone', 'Eldritch Voidstone', 'Originator Voidstone']
const ROD = 'Fishing Rod'
const URN = 'Urn Relic'
const RELICS = ['Candlestick Relic', 'Censer Relic', 'Coffer Relic', 'Papyrus Relic', 'Processional Relic', 'Tome Relic', 'Urn Relic']
// Weapons but a few: the attack ones, the minion ones, caster and bow.
const but = (...out: string[]) => WEAPONS.filter(w => !out.includes(w))
// The bases tooltips show.
const RING = 'Vermillion Ring'
const AMULET = 'Onyx Amulet'
const BOOTS = 'Two-Toned Boots'
const HELMET = 'Hubris Circlet'
const BODY = 'Astral Plate'
const JEWEL = 'Cobalt Jewel'
const BOW = 'Spine Bow'

// Steps: 1 Small, 2 Normal, 3 Decent, 4 Big; guesses at the default steps
// (20 Big, 5 Decent, 1.5 Normal, 0.4 Small). Rows of a section can overlap:
// the louder one wins (applySpecial puts it first).
type Row = [name: string, cls: string | string[], tip: string, fixed: CStep, conds: FilterCondition[], bts?: string[]]
const sec = (cat: string, ...rows: Row[]): SpecialRow[] => rows.map(([name, c, tip, fixed, conds, bts = []]) =>
  ({ cat, name, cls: typeof c === 'string' ? c : c.join('|'), bts, tip, fixed, guess: [0, 0.4, 1.5, 5, 20][fixed] ?? 0, conds }))

export const SPECIAL_ROWS: SpecialRow[] = [
  ...sec('sgveil',
    // Veiled (Betrayal): identified drops, so the mod's name shows.
    ['Fractured with a veiled mod', GEAR, RING, 4, [...FRACT, ID, RARE, mod('Veil')]],
    ['Jewel with a veiled mod', ['Abyss Jewels', 'Jewels'], JEWEL, 3, idr('Veil')],
    ['Veiled prefix and suffix', GEAR, RING, 2, [...CLEAN, ID, RARE, mod('Veiled'), mod('of the Veil')]]),
  ...sec('sgmods',
    // Incursion temple mods, by what each is good on.
    ['Fractured with a temple mod', GEAR, BOOTS, 3, [...FRACT, ID, RARE, mod(...INCURSION)]],
    ['Temple boots: Matatl\'s speed and traps', 'Boots', BOOTS, 3, idr("Matatl's")],
    ['Temple caster weapon or shield', ['Rune Daggers', 'Sceptres', 'Shields', 'Staves', 'Wands'], BOW, 3, idr("Matatl's", 'Tacati', "Topotante's")],
    ['Temple elemental weapon: Topotante\'s', ['Bows', 'Claws', 'Daggers', 'Thrusting One Hand Swords', 'Wands'], BOW, 3, idr("Topotante's")],
    ['Temple jewellery', JEWELLERY, AMULET, 3, idr(...INCURSION)],
    ['Temple gloves or helmet', ['Gloves', 'Helmets'], HELMET, 3, idr('Puhuarte', 'Topotante')],
    ['Temple attack weapon: Tacati\'s', but('Rune Daggers', 'Sceptres', 'Staves'), BOW, 3, idr('of Tacati', "Tacati's")],
    ['Temple body armour: Guatelitzi\'s life', 'Body Armours', BODY, 2, idr("Guatelitzi's")],
    ['Temple minion weapon: Citaqualotl\'s', but('Bows', 'Two Hand Axes', 'Two Hand Maces', 'Two Hand Swords', 'Warstaves'), BOW, 2, idr("Citaqualotl's")],
    ['Magic item with a temple mod', '', BOOTS, 2, [ID, MAGIC, mod(...INCURSION)]],
    // Necropolis, Bestiary, Delve and mercenary mods.
    ['Haunted mods (Necropolis)', '', RING, 4, idr('Haunted', 'of Haunting')],
    ['Fractured with a Delve mod', '', AMULET, 4, [T('FracturedItem'), ID, NOT_UNIQUE, mod('of the Underground', 'Subterranean')]],
    ['Delve mod', '', AMULET, 4, [ID, NOT_UNIQUE, mod('of the Underground', 'Subterranean')]],
    ['Beast mods: Farrul or Fenumus', '', HELMET, 3, idr('of Farrul', 'of Fenumus')],
    ['Beast mods: Craiceann or Saqawal', '', HELMET, 2, idr('of Craiceann', 'of Saqawal')],
    ['Mercenary mods on armour or jewellery', [...JEWELLERY, ...ARMOUR], BODY, 3, [ID, NOT_UNIQUE, mod('Infamous', 'of Infamy')]],
    ['Mercenary mods on a caster or bow weapon', ['Bows', 'Staves', 'Wands', 'Warstaves'], BOW, 3, [ID, NOT_UNIQUE, mod('Infamous')]]),
  ...sec('sgvar',
    // Variations.
    ['Double corrupted jewellery, gloves or jewel', ['Abyss Jewels', 'Amulets', 'Belts', 'Gloves', 'Jewels', 'Quivers', 'Rings'], AMULET, 4, DOUBLE],
    ['Double corrupted', '', BODY, 3, DOUBLE],
    ['Ring with a corrupted implicit, item level 75+', 'Rings', RING, 3, [T('Corrupted'), cnd('CorruptedMods', '>=', ['1']), ilvl('>=', 75), NOT_UNIQUE]],
    ['Enchanted armour or weapon', [...ARMOUR, ...WEAPONS], HELMET, 4, [T('AnyEnchantment'), NOT_UNIQUE]],
    ['Anointed amulet', 'Amulets', AMULET, 3, [T('AnyEnchantment'), ...CLEAN, NOT_UNIQUE]],
    ['Fractured jewel, flask or heist gear', ['Abyss Jewels', 'Heist Brooches', 'Heist Cloaks', 'Heist Gear', 'Heist Tools', 'Jewels', 'Utility Flasks'], JEWEL, 3, [...FRACT, NOT_UNIQUE]],
    ['Fractured jewellery', JEWELLERY, RING, 3, [...FRACT, NOT_UNIQUE]],
    ['Fractured armour or weapon, item level 84+', [...ARMOUR, ...WEAPONS], HELMET, 2, [...FRACT, NOT_UNIQUE, ilvl('>=', 84)]],
    ['Abyss socket', [...ARMOUR.filter(x => x !== 'Quivers'), ...WEAPONS], HELMET, 3, [NOT_UNIQUE, cnd('SocketGroup', '', ['A'])]]),
  ...sec('sginfl',
    // Influenced: any rarity, so a white or magic base for crafting shows too.
    // Unidentified rares of item level 68+ meet the rare weights first.
    ['Influenced jewellery, item level 82+', JEWELLERY, AMULET, 3, [INFL, NOT_UNIQUE, ilvl('>=', 82)]],
    ['Influenced, item level 86+', GEAR, HELMET, 3, [INFL, NOT_UNIQUE, ilvl('>=', 86)]],
    ['Influenced, item level 84-85', GEAR, HELMET, 2, [INFL, NOT_UNIQUE, ilvl('>=', 84), ilvl('<=', 85)]],
    ['Influenced, item level under 84', GEAR, HELMET, 1, [INFL, NOT_UNIQUE, ilvl('<', 84)]]),
  ...sec('sgclass',
    // Item kinds of their own.
    ['Imbued', '', HELMET, 4, [T('Imbued'), NOT_UNIQUE]],
    ['Synthesised', '', RING, 4, [T('SynthesisedItem'), NOT_UNIQUE]],
    ['Voidstone', '', 'Ceremonial Voidstone', 4, [], VOIDSTONES],
    ['Trinket', 'Trinkets', 'Thief\'s Trinket', 4, []],
    ['Fishing rod', 'Fishing Rods', ROD, 4, []],
    ['Unique piece', 'Pieces', ROD, 4, [cnd('Rarity', '', ['Unique'])]],
    ['Relic, the good kinds', 'Relics', URN, 4, [NOT_UNIQUE], RELICS],
    ['Relic', 'Relics', URN, 2, [NOT_UNIQUE]]),
  ...sec('sgshroud',
    // Event and league bases.
    ['Enshrouded item', '', 'Enshrouded Quiver', 4, [], ENSHROUDED]),
  ...sec('sgidol',
    ['Rare or white idol', 'Idols', 'Minor Idol', 3, [cnd('Rarity', '', ['Normal', 'Rare'])]],
    ['Magic idol', 'Idols', 'Minor Idol', 2, [MAGIC]])
]

// NeverSink's rules ours take over. Quest-like items (questlikeexception)
// and influenced maps stay theirs.
export const SPECIAL_NS_TYPE = /^(exoticmods|artefact->(misc|sanctifiedrelics)|exotic->(corruptions|sockets|fractured|enchanted)|influenced->all|enshrouded|event->idols)$/
// Where ours go: NeverSink's influenced section (maps first), else the first
// of the rules we take over.
export const SPECIAL_ANCHOR = /^(maps->influenced|influenced->all)$/

// In maps (where the Loot rules apply: `gate`, their area conditions) our
// rules decide, so NeverSink's copies only apply below them. With the Loot
// rules on everywhere, they go. Returns how many it changed.
export function retireSpecial (doc: FilterDoc, gate: readonly FilterCondition[]): number {
  let n = 0
  const floor = gate.find(c => c.key === 'AreaLevel' && c.op === '>=')
  for (const b of doc.blocks) {
    if (b.type == null || !SPECIAL_NS_TYPE.test(b.type) || b.disabled) continue
    if (b.conditions.some(c => c.key === 'AreaLevel' && c.op === '<' && c.values[0] === floor?.values[0])) continue
    if (floor) b.conditions = [...b.conditions, { key: 'AreaLevel', op: '<', count: null, values: [...floor.values] }]
    else b.disabled = true
    b.dirty = true
    n++
  }
  return n
}

// Where ours go in `doc` (a chunk index).
export function specialAnchor (doc: FilterDoc): number {
  const first = (re: RegExp) => doc.blocks.find((b): b is FilterBlock => b.type != null && re.test(b.type))
  const at = first(SPECIAL_ANCHOR) ?? first(SPECIAL_NS_TYPE) ?? doc.blocks.find(b => !b.type?.startsWith('woke->'))
  return at ? doc.chunks.indexOf(at) : doc.chunks.length
}
