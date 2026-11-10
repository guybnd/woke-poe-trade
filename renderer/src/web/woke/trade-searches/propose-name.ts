// The name the save box offers for a price check search: what you'd call the
// item. A link from a finished search has only an id in it, so the name comes
// from the item and its ticked stats, not the link.
import { ItemRarity } from '@/parser'
import type { ParsedItem } from '@/parser'
import { FilterTag } from '@/web/price-check/filters/interfaces'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'

const MAX_LENGTH = 60
const MAX_STATS = 2

// "+#% to Fire Resistance" → "Fire Resistance", "Adds # to # Cold Damage to Attacks" → "Adds Cold Damage to Attacks".
export function shortStatLabel (text: string): string {
  return text
    .replace(/[+-]?#%?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^Adds to /i, 'Adds ')
    .replace(/^(to|increased) /i, '')
    .replace(/:$/, '')
    .trim()
}

function tickedStats (stats: FilterOrGroup[]): StatFilter[] {
  return stats.filter((s): s is StatFilter =>
    !s.group && !s.disabled && !s.not && !s.hidden && s.tag !== FilterTag.Property && Boolean(s.text))
}

function clip (name: string): string {
  return name.length > MAX_LENGTH ? name.slice(0, MAX_LENGTH - 1).trimEnd() + '…' : name
}

export function proposeSearchName (item: ParsedItem, stats: FilterOrGroup[] = []): string {
  const name = item.info.name
  if (item.rarity === ItemRarity.Unique) {
    return clip(item.sockets?.linked ? `${name} ${item.sockets.linked}L` : name)
  }
  if (item.gemLevel != null) {
    const q = item.quality ? `/${item.quality}` : ''
    return clip(`${name} ${item.gemLevel}${q}`)
  }
  if (item.mapTier != null) {
    return clip(`${name} T${item.mapTier}`)
  }
  const labels: string[] = []
  for (const stat of tickedStats(stats)) {
    const label = shortStatLabel(stat.text)
    if (label && !labels.includes(label)) labels.push(label)
    if (labels.length === MAX_STATS) break
  }
  return clip(labels.length ? `${name}: ${labels.join(', ')}` : name)
}
