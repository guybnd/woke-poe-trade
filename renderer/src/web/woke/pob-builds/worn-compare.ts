// A build's item against the one your character wears in that slot (its last
// read), for the item tooltip on the build window's Gear tab.
import { parseClipboard } from '@/parser'
import type { ParsedItem } from '@/parser'
import { ItemCategory, WEAPONE_TWO_HANDED_MELEE } from '@/parser/meta'
import { personalOn } from '../personal'
import { character } from './character'
import { pobItemText } from './item-text'
import { slotLabel } from './build-model'
import { swapCheck } from './swap-check'
import type { SwapResult } from './swap-check'
import type { PobItem } from './widget'

export interface WornCompare { title: string, source?: string, result: SwapResult }

const sameName = (a: PobItem, b: PobItem) => a.name.trim().toLowerCase() === b.name.trim().toLowerCase()
const group = (slot: string) => /^Ring/.test(slot) ? 'ring' : /^Flask/.test(slot) ? 'flask' : null
// From the build item's side: the swap that loses least comes first.
const RANK: Record<SwapResult['verdict'], number> = { better: 0, same: 1, mixed: 2, worse: 3 }

function parsed (item: PobItem): ParsedItem | null {
  const r = parseClipboard(pobItemText(item))
  return r.isOk() ? r.value : null
}

const note = (title: string, source: string, verdict: SwapResult['verdict'], summary: string): WornCompare =>
  ({ title, source, result: { verdict, summary, rows: [] } })

export function wornCompare (slot: string, buildItem: PobItem): WornCompare | null {
  const s = personalOn.value ? character.value : null
  if (!s) return null
  const at = new Date(s.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const source = `Yours: what ${s.character.name} wore at ${at}, read from pathofexile.com.`
  const g = group(slot)

  // Rings and flasks go in any order: one you already wear anywhere is yours.
  if (g) {
    const mine = s.gear.filter(x => group(x.slot) === g)
    const same = mine.find(x => sameName(x.item, buildItem))
    if (same) return note(`You wear this as your ${slotLabel(same.slot).toLowerCase()}`, source, 'same', 'Already on your character.')
    // The compare reads no flask stats: it would only say "other mods differ".
    if (g === 'flask') return null
  }

  const theirs = parsed(buildItem)
  if (!theirs) return null
  const candidates = g ? s.gear.filter(x => group(x.slot) === g) : s.gear.filter(x => x.slot === slot)

  if (!candidates.length) {
    // An off-hand next to a two-handed weapon (or a bow, for a quiver) can't just be added.
    if (slot === 'Weapon 2') {
      const main = s.gear.find(x => x.slot === 'Weapon 1')?.item
      const cat = main ? parsed(main)?.category : undefined
      if (cat && (WEAPONE_TWO_HANDED_MELEE.has(cat) || (cat === ItemCategory.Bow && theirs.category !== ItemCategory.Quiver))) {
        return note(`You hold ${main!.name || main!.base} in both hands`, source, 'mixed', 'This needs a one-handed weapon in your main hand.')
      }
    }
    return note(`Your ${slotLabel(slot).toLowerCase()} slot is empty`, source, 'better', 'You wear nothing there.')
  }

  let best: WornCompare | null = null
  for (const c of candidates) {
    const yours = parsed(c.item)
    if (!yours) continue
    const result = swapCheck(yours, theirs, null)
    if (!best || RANK[result.verdict] < RANK[best.result.verdict]) {
      best = { title: `Against your ${c.item.name || c.item.base}`, source, result }
    }
  }
  return best
}
