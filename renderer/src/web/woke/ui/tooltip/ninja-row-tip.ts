// A poe.ninja row as the item it stands for, for the item tooltip. Most rows
// are named after their item ("Divine Orb", "Kaom's Heart"), but some
// categories name the row after what sets its price: a Forbidden jewel by its
// notable, a cluster jewel by its enchant, a map by tier, a Filled Coffin by
// its mod. Every window passes the same {name, type, variant} (Prices tab,
// Forbidden finder, Ctrl+Space, Net worth), so the mapping lives here, once.
// Pure: item-tip.ts loads the data.
import { baseTip, buildTip, kindOfNinjaType, uniqueTip } from './tip-content'
import type { TipKind, TipLine, TipModel, TipPack, TipTone } from './tip-content'

export interface NinjaRowRef { name: string, type?: string, variant?: string }

export interface RowTip {
  // The tooltip data the row needs (packFiles).
  kind: TipKind
  // The row's own tooltip, when its name isn't an item's.
  build?: (pack: TipPack) => TipModel | null
  // A Forbidden jewel row: the notable, for its stats from the passive tree.
  forbidden?: { notable: string, jewel: 'Forbidden Flame' | 'Forbidden Flesh' }
  // A map row: the map, for the cards that drop there.
  map?: string
}

const pair = (label: string, value: string): TipLine => [{ text: `${label}: `, tone: 'label' }, { text: value, tone: 'value' }]
const line = (text: string, tone: TipTone): TipLine => [{ text, tone }]
const present = (sections: TipLine[][]) => sections.filter(s => s.length)

// poe.ninja's variant is a comma list ("Forbidden Flesh, Guardian", "8 passives, 84", "T0, Gen-24").
const parts = (variant?: string) => (variant ?? '').split(',').map(s => s.trim()).filter(Boolean)

const FORBIDDEN = /^Forbidden (Flame|Flesh)$/

// "Bastion of Hope", variant "Forbidden Flesh" (and maybe more): Forbidden
// Flesh with that notable as its one mod.
function forbiddenTip (ref: NinjaRowRef): RowTip {
  const jewel = parts(ref.variant).find(p => FORBIDDEN.test(p))
  const name = jewel === 'Forbidden Flesh' ? 'Forbidden Flesh' : 'Forbidden Flame'
  const other = name === 'Forbidden Flame' ? 'Forbidden Flesh' : 'Forbidden Flame'
  return {
    kind: 'unique',
    forbidden: { notable: ref.name, jewel: name },
    build: (pack) => {
      const unique = pack.uniques?.[name] ?? pack['unique-extras']?.[name]
      const mod = `Allocates ${ref.name} if you have the matching modifier on ${other}`
      if (!unique) return { name, base: name === 'Forbidden Flame' ? 'Crimson Jewel' : 'Cobalt Jewel', frame: 'unique', sections: [[line(mod, 'mod')]] }
      // The data lists every notable it can roll; this row is the one.
      const v = unique.v.map(r => ({ ...r, e: [mod, ...(r.e ?? []).filter(e => !/^Allocates /.test(e))] }))
      return uniqueTip(name, { ...unique, v }, pack.bases?.[unique.b])
    }
  }
}

// The passive tree's word on a Forbidden row's notable: its class and stats.
export function withForbiddenNotable (model: TipModel, notable: { cls: string, group: string | null, stats: string[] } | null): TipModel {
  if (!notable) return model
  const lines = [
    pair('Requires Class', notable.cls),
    ...(notable.group ? [pair('Ascendancy', notable.group)] : []),
    ...notable.stats.map(s => line(s, 'dim'))
  ]
  return { ...model, sections: [...model.sections, lines] }
}

// A normal cluster jewel: "12% increased Fire Damage", "8 passives, 84".
// The size follows from the passive count (the tree's templates: Small 2-3,
// Medium 4-6, Large 8-12).
function clusterTip (ref: NinjaRowRef): RowTip {
  return {
    kind: 'item',
    build: (pack) => {
      const [count, level] = parts(ref.variant)
      const passives = Number(/^(\d+) passives?$/.exec(count ?? '')?.[1])
      if (!passives) return null
      const base = passives >= 8 ? 'Large Cluster Jewel' : passives >= 4 ? 'Medium Cluster Jewel' : 'Small Cluster Jewel'
      const grants = ref.name.split(', ').filter(Boolean)
      const own = pack.bases?.[base] ? baseTip(base, pack.bases[base], pack['base-extras']?.[base]) : null
      return {
        name: base,
        frame: 'normal',
        sections: present([
          level ? [pair('Item Level', level === '1' ? 'any' : `${level}+`)] : [],
          ...(own?.sections ?? []),
          [
            line(`Adds ${passives} Passive Skills`, 'mod'),
            ...grants.map(g => line(`Added Small Passive Skills grant: ${g}`, 'mod'))
          ]
        ])
      }
    }
  }
}

// "Map (Tier 16)", "Blighted Map (Tier 2)", "The Purifier Map (Tier 16)"
// (3.30 names), or a map name with "Tier 16" as its variant.
const TIERED = /^(.+?) \(Tier (\d+)\)$/
function mapTip (ref: NinjaRowRef): RowTip {
  const m = TIERED.exec(ref.name)
  const name = m ? m[1] : ref.name
  return {
    kind: 'item',
    map: name,
    build: (pack) => {
      const tier = m?.[2] ?? /^Tier (\d+)$/.exec(parts(ref.variant).find(p => /^Tier \d+$/.test(p)) ?? '')?.[1]
      const own = buildTip(pack, { name, kind: 'item' })
      const sections = present([
        tier ? [pair('Map Tier', tier)] : [],
        ...(own?.sections ?? [])
      ])
      // Nothing to add: as the data has it (the hover may still add its cards).
      return tier ? { name, frame: 'normal', sections } : own
    }
  }
}

// A Valdo map: the area, and the Foil unique poe.ninja lists it with ("Foil Brightbeak").
function valdoTip (ref: NinjaRowRef): RowTip {
  return {
    kind: 'item',
    build: () => {
      const foil = parts(ref.variant).find(p => /^Foil /.test(p))
      return {
        name: ref.name,
        base: 'Valdo Map',
        frame: 'normal',
        sections: foil ? [[pair('Reward', foil)]] : []
      }
    }
  }
}

// An Incursion temple room ("Hatchery (Tier 1)"): a Chronicle of Atzoatl with it.
function templeTip (ref: NinjaRowRef): RowTip {
  return {
    kind: 'item',
    build: () => ({
      name: 'Chronicle of Atzoatl',
      frame: 'normal',
      sections: [[pair('Room', ref.name)]]
    })
  }
}

// A Filled Coffin is priced by its mod and corpse level band ("80"):
// the row's name is the mod.
function coffinTip (ref: NinjaRowRef): RowTip {
  return {
    kind: 'item',
    build: (pack) => {
      if (ref.name === 'Filled Coffin') return buildTip(pack, { name: ref.name, kind: 'item' })
      const level = parts(ref.variant)[0]
      return {
        name: 'Filled Coffin',
        frame: 'normal',
        sections: present([
          level ? [pair('Corpse Level', level === '1' ? 'any' : `${level}+`)] : [],
          [line(ref.name, 'mod')]
        ])
      }
    }
  }
}

// Screams of the Desiccated, one row per shrine buff it grants ("Greater Freezing, Massive").
function shrineBeltTip (ref: NinjaRowRef): RowTip {
  return {
    kind: 'unique',
    build: (pack) => {
      const belt = buildTip(pack, { name: ref.name, kind: 'unique' })
      if (!belt || !ref.variant) return belt
      return { ...belt, sections: [...belt.sections, [pair('Shrine', ref.variant)]] }
    }
  }
}

// A gem poe.ninja lists with the support it's imbued with ("Rage").
function imbuedTip (ref: NinjaRowRef): RowTip {
  return {
    kind: 'gem',
    build: (pack) => {
      const gem = buildTip(pack, { name: ref.name, kind: 'gem' })
      if (!gem || !ref.variant) return gem
      return { ...gem, sections: [...gem.sections, [pair('Imbued', ref.variant)]] }
    }
  }
}

const SPECIAL: Record<string, (ref: NinjaRowRef) => RowTip> = {
  ForbiddenJewel: forbiddenTip,
  ClusterJewel: clusterTip,
  Map: mapTip,
  BlightedMap: mapTip,
  BlightRavagedMap: mapTip,
  ValdoMap: valdoTip,
  IncursionTemple: templeTip,
  Coffin: coffinTip,
  ImbuedGem: imbuedTip,
  ShrineBelt: shrineBeltTip
}

// How to show a row's tooltip. `kind` is for a ref with no type (worked out
// from the name by the caller).
export function ninjaRowTip (ref: NinjaRowRef, kind?: TipKind): RowTip {
  const special = ref.type ? SPECIAL[ref.type] : undefined
  if (special) return special(ref)
  return { kind: kind ?? (ref.type ? kindOfNinjaType(ref.type) : 'item') }
}

// The model a row gets from the data alone (no prices, no extras): what
// tipFor starts from, and what the tests check every category against.
export function rowTipModel (pack: TipPack, ref: NinjaRowRef, kind?: TipKind, base?: string): TipModel | null {
  const row = ninjaRowTip(ref, kind)
  return row.build ? row.build(pack) : buildTip(pack, { name: ref.name, kind: row.kind, variant: ref.variant, base })
}
