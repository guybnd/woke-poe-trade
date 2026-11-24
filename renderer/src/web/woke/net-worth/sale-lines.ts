// A sale as a shared profit line (ui/line-item.ts), wherever it is listed
// (the Sales view, Holdings' session list and its Sold list): left out of the
// sales totals, it stays listed, struck. One list of ids per league
// (line-out-store.ts), so leaving one out anywhere shows everywhere.
import { computed, watch } from 'vue'
import { lineKeys, lineMenu, lineToast, openMenu, toast } from '../ui'
import type { MenuEntry } from '../ui'
import { itemMenuHead } from '../ui/tooltip/item-menu'
import { lineOutDoc, loadLineOut, outIdsOf, setLineOut } from './line-out-store'
import { saleMenuRef } from './sale-tip'
import { saleName } from './sales'
import type { Sale } from './sales'
import { salesReply } from './sales-store'

export function useSaleLines (extra: (s: Sale) => MenuEntry[] = () => []) {
  const league = computed(() => salesReply.value?.league ?? null)
  watch(league, (l) => { if (l) loadLineOut(l).catch(() => {}) }, { immediate: true })
  const outIds = computed(() => outIdsOf(lineOutDoc.value, league.value, 'sale'))
  const isOut = (s: Sale) => outIds.value.has(s.id)
  const failed = (e: Error) => { toast(e.message) }
  function leaveOut (s: Sale, out: boolean) {
    const l = league.value
    if (!l) return
    setLineOut(l, 'sale', s.id, out).catch(failed)
    lineToast(out ? 'out' : 'in', saleName(s), () => { setLineOut(l, 'sale', s.id, !out).catch(failed) })
  }
  const handlersOf = (s: Sale) => ({ out: (on: boolean) => { leaveOut(s, on) } })
  // A sale's price is what it sold for: nothing to change.
  const stateOf = (s: Sale) => ({ out: isOut(s), editable: false })
  const entriesOf = (s: Sale): MenuEntry[] => lineMenu(stateOf(s), handlersOf(s), {}, extra(s))
  const headOf = (s: Sale, e: MouseEvent) => itemMenuHead(saleMenuRef(s), e)
  function onMenu (e: MouseEvent, s: Sale) { openMenu(e, entriesOf(s), headOf(s, e) ?? undefined) }
  function onKeys (e: KeyboardEvent, s: Sale) { lineKeys(e, stateOf(s), handlersOf(s)) }
  return { league, outIds, isOut, leaveOut, entriesOf, headOf, onMenu, onKeys }
}
