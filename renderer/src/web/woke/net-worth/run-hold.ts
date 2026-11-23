// The run hotkey (K1): the hovered item joins the run going as held outside
// the stash (faustus.ts HeldItem), at poe.ninja's price, with Undo. Loaded
// only while a run goes (WidgetNetWorth).
import { parseClipboard, ItemRarity } from '@/parser'
import type { ParsedItem } from '@/parser'
import { toast } from '../ui/layer'
import { ninjaPriceOf } from './prices'
import { isRolledMap, itemKey, mapBase } from './valuation'
import { CURRENCY_ITEM } from './faustus'
import type { StashItemLike } from './valuation'
import { editRun, loadRuns, runsDoc } from './run-store'
import type { HeldItem } from './faustus'
import type { LedgerPoint } from './ledger'

// The parsed item as the stash would give it.
export function stashLike (item: ParsedItem): StashItemLike {
  const ns = item.info.namespace
  const frame = ns === 'UNIQUE'
    ? 3
    : ns === 'DIVINATION_CARD'
      ? 6
      : ns === 'GEM'
        ? 4
        : item.rarity === ItemRarity.Magic ? 1 : item.rarity === ItemRarity.Rare ? 2 : item.stackSize ? 5 : 0
  const base = ns === 'UNIQUE' ? (item.uniqueBase?.refName ?? item.info.refName) : item.info.refName
  return {
    name: ns === 'UNIQUE' ? item.info.refName : '',
    typeLine: base,
    baseType: base,
    frame,
    stack: item.stackSize?.value ?? 1,
    icon: item.info.icon,
    ...(item.gemLevel != null ? { gemLevel: item.gemLevel } : {}),
    ...(item.quality != null ? { quality: item.quality } : {}),
    ...(item.mapTier != null ? { mapTier: item.mapTier } : {}),
    ...(item.sockets?.linked ? { links: item.sockets.linked } : {}),
    ...(item.isCorrupted ? { corrupted: true } : {})
  }
}

const CURRENCY_ITEM_NAMES = new Set(Object.values(CURRENCY_ITEM))
let seq = 0

export async function holdHovered (clipboard: string, league: string, points: readonly LedgerPoint[], divine: number | null): Promise<void> {
  const parsed = parseClipboard(clipboard).unwrapOr(null)
  if (!parsed) { toast("Couldn't read that item"); return }
  await loadRuns(league)
  const live = runsDoc.value.live
  if (!live || live.league !== league) { toast('No run going: start one in Net worth › Runs'); return }
  const s = stashLike(parsed)
  // Rares have no price and no name listings share; currency is counted by
  // the stash and sales already.
  if ((s.frame === 1 || s.frame === 2) && !isRolledMap(s)) { toast("Rares and magic items can't be held: they have no price. Stash or list it"); return }
  if (CURRENCY_ITEM_NAMES.has(s.typeLine)) { toast('Currency is counted when it reaches your stash'); return }
  const priced = ninjaPriceOf()(s)
  if (!priced || !(priced.chaos > 0)) { toast(`No price for ${s.name || s.typeLine}: not held`); return }
  const key = itemKey(s)
  const item: HeldItem = {
    id: `h${Date.now().toString(36)}${(seq++).toString(36)}`,
    key,
    name: s.name || s.typeLine,
    icon: s.icon,
    count: s.stack,
    unitChaos: priced.chaos,
    at: Date.now(),
    tallyAdded: live.tally[key]?.added ?? 0,
    ...(isRolledMap(s) ? { base: mapBase(s), ...(s.mapTier != null ? { mapTier: s.mapTier } : {}) } : {})
  }
  await editRun(league, live.id, r => ({ ...r, held: [...(r.held ?? []), item] }), points, divine)
  const value = item.unitChaos * item.count
  const price = divine && value >= divine ? `${(value / divine).toFixed(1)} div` : `${Math.round(value)} c`
  toast(`Added to ${live.name}: ${s.stack > 1 ? `${s.stack} × ` : ''}${item.name} · ${price} · held outside`, {
    undo: () => { editRun(league, live.id, r => ({ ...r, held: (r.held ?? []).filter(h => h.id !== item.id) }), points, divine).catch(() => {}) }
  })
}
