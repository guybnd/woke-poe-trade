// poe.ninja rows for every category the Market's Prices tab lists, for the
// item tooltip check (ninja-row-tip.test.ts). From real data where the app
// has it: rows kept from the Ancestors league poe.ninja dump
// (ninja-rows.sample.json: poe.ninja's own names and variants; unique and
// most gem rows left out, the item data covers them), and the item data's names sorted into poe.ninja's
// categories. Rows whose format the dump lacks follow the price check's
// lookups (getDetailsId.ts): Filled Coffins, cluster jewels.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface SampleRow { type: string, name: string, variant?: string }

const DATA = join(__dirname, '../../public/data')

interface AppItem { name: string, namespace: string, craftable?: { category?: string }, unique?: { base: string } }
const items: AppItem[] = readFileSync(join(DATA, 'en/items.ndjson'), 'utf8').trim().split('\n').map(l => JSON.parse(l))
const dump = JSON.parse(readFileSync(join(__dirname, 'ninja-rows.sample.json'), 'utf8')) as SampleRow[]

const plain = items.filter(i => i.namespace === 'ITEM' && !i.craftable).map(i => i.name)
const corpseBases = new Set(plain.filter(n => /^Perfect /.test(n)).map(n => n.slice('Perfect '.length)))

// An item name's poe.ninja category, for the ones the dump doesn't cover.
const BY_NAME: Array<[string, (n: string) => boolean]> = [
  ['Corpse', n => corpseBases.has(n.replace(/^(?:Perfect|Imperfect) /, ''))],
  ['Fragment', n => /^(?:Sacrifice at |Fragment of the |Mortal |Zorath's Eye)|Reliquary Key$|^Echo of /.test(n)],
  ['Wombgift', n => / Wombgift$/.test(n)],
  ['Runegraft', n => /^Runegraft of /.test(n)],
  ['AllflameEmber', n => /^Allflame Ember /.test(n)],
  ['Tattoo', n => /Tattoo/.test(n)],
  ['Omen', n => /^Omen of /.test(n)],
  ['DjinnCoin', n => /Djinn/.test(n)],
  ['Ducat', n => /Ducat/.test(n)],
  ['EnshroudingCrystal', n => / Enshrouding Crystal$/.test(n)],
  ['Artifact', n => ['Burial Medallion', 'Astragali', 'Exotic Coinage', 'Scrap Metal'].includes(n)],
  ['Oil', n => / Oil$/.test(n)],
  ['Incubator', n => / Incubator$/.test(n)],
  ['ScryingOrb', n => n === 'Scrying Orb'],
  ['Invitation', n => / Invitation$/.test(n)],
  ['Scarab', n => / Scarab /.test(n) || / Scarab$/.test(n)],
  ['DeliriumOrb', n => / Delirium Orb$/.test(n)],
  ['Astrolabe', n => / Astrolabe$/.test(n)],
  ['Memory', n => /^Memory of /.test(n)],
  ['Essence', n => /Essence of /.test(n)],
  ['Fossil', n => / Fossil$/.test(n)],
  ['Resonator', n => / Resonator$/.test(n)],
  ['Vial', n => /^Vial of /.test(n)],
  ['Coffin', n => n === 'Filled Coffin']
]

// A unique's poe.ninja category, from its base's category. Heist contracts and
// unique fragments aren't among the Prices tab's categories: left out.
const BASE_CATEGORY = new Map(items.filter(i => i.namespace === 'ITEM').map(i => [i.name, i.craftable?.category]))
const UNIQUE_TYPE: Record<string, string> = {
  'Ring': 'UniqueAccessory',
  'Amulet': 'UniqueAccessory',
  'Belt': 'UniqueAccessory',
  'Helmet': 'UniqueArmour',
  'Body Armour': 'UniqueArmour',
  'Gloves': 'UniqueArmour',
  'Boots': 'UniqueArmour',
  'Shield': 'UniqueArmour',
  'Quiver': 'UniqueArmour',
  'Jewel': 'UniqueJewel',
  'Abyss Jewel': 'UniqueJewel',
  'Cluster Jewel': 'UniqueJewel',
  'Flask': 'UniqueFlask',
  'Idol': 'UniqueIdol',
  'Map': 'UniqueMap',
  'Sanctum Relic': 'UniqueRelic',
  'Tincture': 'UniqueTincture'
}
const WEAPONS = new Set(['One-Handed Sword', 'Bow', 'Sceptre', 'Wand', 'Warstaff', 'Claw', 'Two-Handed Axe', 'Two-Handed Sword', 'Staff', 'Two-Handed Mace', 'Rune Dagger', 'One-Handed Mace', 'One-Handed Axe', 'Dagger', 'Fishing Rod'])
function uniqueType (base: string | undefined): string | undefined {
  const category = base ? BASE_CATEGORY.get(base) : undefined
  if (!category) return undefined
  return WEAPONS.has(category) ? 'UniqueWeapon' : UNIQUE_TYPE[category]
}

export function sampleRows (): SampleRow[] {
  const rows: SampleRow[] = []
  for (const i of dump) rows.push({ type: i.type, name: i.name, variant: i.variant })
  for (const name of plain) {
    const hit = BY_NAME.find(([, test]) => test(name))
    rows.push({ type: hit?.[0] ?? 'Currency', name })
  }
  for (const i of items) {
    if (i.namespace === 'DIVINATION_CARD') rows.push({ type: 'DivinationCard', name: i.name })
    if (i.namespace === 'GEM') rows.push({ type: 'SkillGem', name: i.name, variant: '20/20' })
    const type = i.namespace === 'UNIQUE' ? uniqueType(i.unique?.base) : undefined
    if (type) rows.push({ type, name: i.name })
    if (i.namespace === 'CAPTURED_BEAST') rows.push({ type: 'Beast', name: i.name })
  }
  rows.push(
    // Filled Coffin: its mod and corpse level band (getDetailsId.ts).
    { type: 'Coffin', name: '(12-16)% to All Resistances', variant: '80' },
    // Cluster jewels: enchant, "N passives, level band".
    { type: 'ClusterJewel', name: '12% increased Fire Damage', variant: '8 passives, 84' },
    { type: 'ClusterJewel', name: 'Minions deal 10% increased Damage', variant: '4 passives, 1' },
    // An older map row: the name and "Tier 16".
    { type: 'Map', name: 'Strand Map', variant: 'Tier 16' },
    { type: 'Flask', name: 'Divine Life Flask' }
  )
  return rows
}
