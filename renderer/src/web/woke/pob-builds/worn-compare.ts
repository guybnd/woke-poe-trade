// A build's item against the one your character wears in that slot (its last
// read), for the item tooltip on the build window's Gear tab.
import { parseClipboard } from '@/parser'
import { personalOn } from '../personal'
import { character } from './character'
import { pobItemText } from './item-text'
import { slotLabel } from './build-model'
import { swapCheck } from './swap-check'
import type { SwapResult } from './swap-check'
import type { PobItem } from './widget'

export interface WornCompare { title: string, source?: string, result: SwapResult }

export function wornCompare (slot: string, buildItem: PobItem): WornCompare | null {
  const s = personalOn.value ? character.value : null
  if (!s) return null
  const at = new Date(s.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const source = `Yours: what ${s.character.name} wore at ${at}, read from pathofexile.com.`
  const worn = s.gear.find(x => x.slot === slot)?.item
  if (!worn) {
    return { title: `Your ${slotLabel(slot).toLowerCase()} slot is empty`, source, result: { verdict: 'better', summary: 'You wear nothing there.', rows: [] } }
  }
  const yours = parseClipboard(pobItemText(worn))
  const theirs = parseClipboard(pobItemText(buildItem))
  if (yours.isErr() || theirs.isErr()) return null
  const result = swapCheck(yours.value, theirs.value, null)
  return { title: `Against your ${worn.name || worn.base}`, source, result }
}
