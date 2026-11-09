// Which of a price-checked item's mods a swap can change, and into what.
// Pure: no Vue, no IO, so the rules can be tested on parsed items.

import { toRaw } from 'vue'
import { ItemRarity, ParsedItem } from '@/parser'
import { ModifierType } from '@/parser/modifiers'
import type { ParsedModifier } from '@/parser/advanced-mod-desc'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { familyOn, HarvestSwapConfig, KEY_LABEL, SwapFamily, SWAP_FAMILIES } from './families'

export interface SwapCandidate {
  filter: StatFilter
  family: SwapFamily
  /** The key the mod has now. */
  from: string
  /** Keys it can become. For a random family, the swap lands on one of them by chance. */
  targets: string[]
  /** Another mod on the item is hit by the same craft, so the game picks one of the two at random. */
  randomTarget: boolean
  /** Bottom of the mod's tier, when the item text gave it. A swap rerolls inside the tier. */
  tierMin?: number
}

// Mods a swap can change. Fractured ones can't change; bench crafts are re-crafted instead.
const CHANGEABLE = new Set<string>([ModifierType.Explicit])
// Mods that block a target: the game won't put a second mod of the same kind on the item.
const ON_ITEM = new Set<string>([ModifierType.Explicit, ModifierType.Fractured, ModifierType.Crafted])

function findMember (ref: string): { family: SwapFamily, key: string } | null {
  for (const family of SWAP_FAMILIES) {
    for (const member of family.members) {
      for (const key of family.keys) {
        if (member[key] === ref) return { family, key }
      }
    }
  }
  return null
}

function itemCanBeCrafted (item: ParsedItem): boolean {
  if (item.rarity !== ItemRarity.Rare && item.rarity !== ItemRarity.Magic) return false
  return !item.isCorrupted && !item.isMirrored && !item.isUnmodifiable
}

function statRefs (mods: ParsedModifier[]): string[] {
  return mods.flatMap(mod => mod.stats.map(s => s.stat.ref))
}

export function detectSwaps (item: ParsedItem, stats: FilterOrGroup[], config?: HarvestSwapConfig): SwapCandidate[] {
  if (!itemCanBeCrafted(item)) return []
  const onItem = item.newMods.filter(mod => ON_ITEM.has(mod.info.type))
  const out: SwapCandidate[] = []

  for (const filter of stats) {
    if ('group' in filter && filter.group) continue
    const stat = filter as StatFilter
    const found = findMember(stat.statRef)
    if (!found || !familyOn(found.family, config)) continue
    const { family, key } = found
    if (stat.tag !== ModifierType.Explicit && stat.tag !== ModifierType.Pseudo) continue
    if (family.onlyTicked && stat.disabled) continue

    // The filter's number must come from one plain mod, the one the craft changes.
    if (stat.sources.length !== 1) continue
    const source = stat.sources[0]
    if (!CHANGEABLE.has(source.modifier.info.type)) continue
    if (source.modifier.stats.length !== 1) continue
    const sourceRef = source.stat.stat.ref
    if (family.members[0][key] !== sourceRef) continue

    // The price check's filters are reactive copies, so compare the plain objects.
    const sourceMod = toRaw(source.modifier)
    const others = onItem.filter(mod => toRaw(mod) !== sourceMod)
    const otherRefs = statRefs(others)

    if (family.random) {
      // The ducat needs the item's only attribute mod.
      if (otherRefs.some(ref => family.catches.test(ref))) continue
    }

    const targets = family.keys.filter(k =>
      k !== key &&
      !family.members.some(member => otherRefs.includes(member[k])))
    if (!targets.length) continue

    const word = KEY_LABEL[key]
    const randomTarget = !family.random && otherRefs.some(ref =>
      family.catches.test(ref) && ref.includes(word))

    out.push({
      filter: stat,
      family,
      from: key,
      targets,
      randomTarget,
      tierMin: family.anyRoll ? undefined : source.stat.roll?.min
    })
  }
  return out
}

export { DEFAULT_HIGHLIGHT_CHAOS } from './families'
