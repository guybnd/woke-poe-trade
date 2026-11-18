import { ParsedItem, ItemRarity, ItemCategory } from '@/parser'
import { SPECIAL_SUPPORT_GEM, floorToBracket } from '../filters/create-item-filters'
import { JEWELLERY, ARMOUR, WEAPON } from '@/parser/meta'

export function isValuableBasetype (item: ParsedItem): boolean {
  if (
    !(item.rarity === ItemRarity.Normal || item.rarity === ItemRarity.Magic || item.rarity === ItemRarity.Rare) ||
    !item.category
  ) return false

  return (
    JEWELLERY.has(item.category) ||
    ARMOUR.has(item.category) ||
    WEAPON.has(item.category) ||
    item.category === ItemCategory.Quiver
  )
}

export function getDetailsId (item: ParsedItem) {
  if (item.category === ItemCategory.Gem) {
    return forSkillGem(item)
  }
  if (item.category === ItemCategory.Map) {
    // woke: 3.30 maps are "Map (Tier 16)"; poe.ninja names its rows that way
    // and puts T0 in every variant ("Map (Tier 16)", "T0, Gen-24").
    const tiered = item.rarity !== ItemRarity.Unique && item.mapTier != null
    return {
      ns: item.info.namespace,
      name: tiered ? `${item.info.refName} (Tier ${item.mapTier})` : item.info.refName,
      variant: variant([
        'T0',
        (item.rarity !== ItemRarity.Unique)
          ? (item.mapTier) ? 'Gen-24' : 'Atlas'
          : null
      ])
    }
  }
  if (item.rarity === ItemRarity.Unique) {
    return forUniqueItem(item)
  }
  if (isValuableBasetype(item)) {
    return forBasetype(item)
  }
  if (item.info.refName === 'Filled Coffin') {
    const stat = item.statsByType[0]
    return {
      ns: item.info.namespace,
      name: stat.stat.ref.replace('#', String(stat.sources[0].contributes?.value)),
      variant: floorToBracket(item.itemLevel!, [1, 70, 80, 84]).toString()
    }
  }
  if (item.category === ItemCategory.ClusterJewel && item.rarity === ItemRarity.Normal) {
    return forClusterJewel(item)
  }
  // woke: poe.ninja prices Wombgifts by item level ("Ancient Wombgift", "40").
  if (item.info.refName.endsWith(' Wombgift') && item.itemLevel) {
    return {
      ns: item.info.namespace,
      name: item.info.refName,
      variant: floorToBracket(item.itemLevel, WOMBGIFT_LEVELS).toString()
    }
  }
  return {
    ns: item.info.namespace,
    name: item.info.refName,
    variant: undefined
  }
}

const WOMBGIFT_LEVELS = [40, 68, 75, 84]

// woke: a normal cluster jewel's row is its enchant ("12% increased Fire
// Damage", two lines joined by ", " in the game's order) and "8 passives, 84":
// passive count and item level band.
const CLUSTER_LEVELS = [1, 50, 68, 75, 84]
const CLUSTER_PASSIVES = /^Adds (\d+) Passive Skills? \(enchant\)$/
const CLUSTER_GRANT = /^Added Small Passive Skills grant: (.+) \(enchant\)$/

function forClusterJewel (item: ParsedItem) {
  if (!item.itemLevel) return
  let passives: string | undefined
  const grants: string[] = []
  for (const line of item.rawText.split(/\r?\n/)) {
    const count = CLUSTER_PASSIVES.exec(line)
    if (count) passives = count[1]
    const grant = CLUSTER_GRANT.exec(line)
    if (grant) grants.push(grant[1])
  }
  if (!passives || !grants.length) return
  return {
    ns: item.info.namespace,
    name: grants.join(', '),
    variant: `${passives} passives, ${floorToBracket(item.itemLevel, CLUSTER_LEVELS)}`
  }
}

// poe.ninja lists double influence in this order: "83, Shaper/Elder".
const INFLUENCE_ORDER = ['Shaper', 'Elder', 'Crusader', 'Redeemer', 'Warlord', 'Hunter']

function forSkillGem (item: ParsedItem) {
  // woke: poe.ninja prices imbued gems apart ("Sunder", "Constriction"), in a
  // list we don't load. The plain gem's price is far off, so none is better.
  if (item.imbuedGem) return
  // woke: Awakened Empower, Enlighten and Enhance are listed at level 1 (with
  // quality) and at their top level, 4 and 5c (without): a maxed one was
  // looked up as level 1, or not found once corrupted.
  if (
    item.info.refName.startsWith('Awakened ') &&
    SPECIAL_SUPPORT_GEM.includes(item.info.refName.slice('Awakened '.length)) &&
    item.gemLevel! >= (item.info.gem?.maxLevel ?? 20)
  ) {
    return {
      ns: item.info.namespace,
      name: item.info.refName,
      variant: `${item.gemLevel}${item.isCorrupted ? 'c' : ''}`
    }
  }
  let variant = ''
  if (
    SPECIAL_SUPPORT_GEM.includes(item.info.refName) ||
    item.info.refName === 'Portal' ||
    item.info.refName === 'Brand Recall' ||
    item.info.refName === 'Blood and Sand' ||
    item.gemLevel! >= 20
  ) {
    variant += `${item.gemLevel}`
  } else {
    variant += '1'
  }
  if (
    item.quality &&
    !SPECIAL_SUPPORT_GEM.includes(item.info.refName) &&
    !(item.info.refName === 'Brand Recall' && item.isCorrupted)
    // @TODO(poe.ninja blocking): !(item.info.refName === 'Blood and Sand' && item.isCorrupted)
  ) {
    // Gem Q20 with up to 4xGCP (TODO: should this rule apply to corrupted gems?)
    const q = (item.quality >= 16 && item.quality <= 20) ? 20 : item.quality
    variant += `/${q}`
  }
  if (item.isCorrupted && item.info.refName !== 'Portal') {
    variant += 'c'
  }

  return {
    ns: item.info.namespace,
    name: item.info.refName,
    variant
  }
}

function forBasetype (item: ParsedItem) {
  if (item.influences.length > 2) return
  const influences = [...item.influences]
    .sort((a, b) => INFLUENCE_ORDER.indexOf(a) - INFLUENCE_ORDER.indexOf(b))

  return {
    ns: item.info.namespace,
    name: item.info.refName,
    variant: variant([
      (item.itemLevel! >= 86) ? '86+' : String(item.itemLevel!),
      (influences.length) ? influences.join('/') : null
    ])
  }
}

function forUniqueItem (item: ParsedItem) {
  if (!item.uniqueBase) return

  return {
    ns: item.info.namespace,
    name: item.info.refName,
    variant: variant([
      getUniqueVariant(item),
      (item.category === ItemCategory.Flask) ? null
        : (item.category === ItemCategory.SanctumRelic) ? 'Relic'
            // woke: unique tinctures are listed as "Tincture", not by base.
            : (item.category === ItemCategory.Tincture) ? 'Tincture'
                : item.uniqueBase.refName,
      (item.sockets?.linked) ? `${item.sockets.linked}L` : null
    ])
  }
}

function variant (props: Array<string | null>): string | undefined {
  props = props.filter(p => p != null)
  if (!props.length) return undefined
  return props.join(', ')
}

function getUniqueVariant (item: ParsedItem) {
  function hasStat (item: ParsedItem, stat: string) {
    return item.statsByType.some(m => m.stat.ref === stat)
  }

  const uniqueName = item.info.refName

  // woke: poe.ninja no longer splits Vessel of Vinktar or Yriel's Fostering by mod.
  if (uniqueName === "Atziri's Splendour") {
    if (hasStat(item, '#% increased Armour, Evasion and Energy Shield')) {
      return 'Armour/Evasion/ES'
    } else if (hasStat(item, '#% increased Evasion and Energy Shield') && hasStat(item, '+# to maximum Energy Shield')) {
      return 'Evasion/ES'
    } else if (hasStat(item, '#% increased Evasion and Energy Shield') && hasStat(item, '+# to maximum Life')) {
      return 'Evasion/ES/Life'
    } else if (hasStat(item, '#% increased Armour and Energy Shield') && hasStat(item, '+# to maximum Energy Shield')) {
      return 'Armour/ES'
    } else if (hasStat(item, '#% increased Armour and Energy Shield') && hasStat(item, '+# to maximum Life')) {
      return 'Armour/ES/Life'
    } else if (hasStat(item, '#% increased Armour and Evasion') && hasStat(item, '+# to maximum Life')) {
      return 'Armour/Evasion'
    } else if (hasStat(item, '+# to maximum Energy Shield') && hasStat(item, '#% increased Energy Shield')) {
      return 'ES'
    } else if (hasStat(item, '#% increased Evasion Rating') && hasStat(item, '+# to maximum Life')) {
      return 'Evasion'
    } else if (hasStat(item, '#% increased Armour') && hasStat(item, '+# to maximum Life')) {
      return 'Armour'
    }
  } else if (uniqueName === 'Bubonic Trail' || uniqueName === 'Lightpoacher' || uniqueName === 'Shroud of the Lightless' || uniqueName === 'Tombfist') {
    const sockets = item.statsByType.find(m => m.type === 'explicit' && m.stat.ref === 'Has # Abyssal Sockets')!
    const roll = sockets.sources[0].contributes!.value
    if (roll === 2) {
      return '2 Jewels'
    } else if (roll === 1) {
      return '1 Jewel'
    }
  } else if (uniqueName === "Volkuur's Guidance") {
    if (hasStat(item, 'Adds # to # Cold Damage to Spells and Attacks')) {
      return 'Cold'
    } else if (hasStat(item, 'Adds # to # Fire Damage to Spells and Attacks')) {
      return 'Fire'
    } else if (hasStat(item, 'Adds # to # Lightning Damage to Spells and Attacks')) {
      return 'Lightning'
    }
  } else if (uniqueName === "Doryani's Invitation") {
    if (hasStat(item, '#% increased Global Physical Damage')) {
      return 'Physical'
    } else if (hasStat(item, '#% increased Fire Damage')) {
      return 'Fire'
    } else if (hasStat(item, '#% increased Cold Damage')) {
      return 'Cold'
    } else if (hasStat(item, '#% increased Lightning Damage')) {
      return 'Lightning'
    }
  } else if (uniqueName === 'Impresence') {
    if (hasStat(item, 'Adds # to # Cold Damage')) {
      return 'Cold'
    } else if (hasStat(item, 'Adds # to # Chaos Damage')) {
      return 'Chaos'
    } else if (hasStat(item, 'Adds # to # Fire Damage')) {
      return 'Fire'
    } else if (hasStat(item, 'Adds # to # Lightning Damage')) {
      return 'Lightning'
    } else if (hasStat(item, 'Adds # to # Physical Damage')) {
      return 'Physical'
    }
  } else if (uniqueName === 'Voices') {
    const passives = item.statsByType.find(m => m.stat.ref === 'Adds # Small Passive Skills which grant nothing')!
    const roll = passives.sources[0].contributes!.value
    if (roll === 7) {
      return '7 passives'
    } else if (roll === 5) {
      return '5 passives'
    } else if (roll === 3) {
      return '3 passives'
    }
  } else if (uniqueName === 'The First Crest') {
    if (hasStat(item, 'Aureus Coins are converted to Experience upon defeating the Herald of the Scourge')) {
      return 'Experience'
    } else if (hasStat(item, 'Aureus Coins are converted to Relics upon defeating the Herald of the Scourge')) {
      return 'Relics'
    } else if (hasStat(item, 'Aureus Coins are converted to Tainted Currency upon defeating the Herald of the Scourge')) {
      return 'Tainted Currency'
    }
  }
  return null
}
