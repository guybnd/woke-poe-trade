// The hover behind a price check mod row's tier tooltip (mod-tip.ts), shared
// by the picked row (FilterModifier.vue) and PoE mode's unpicked line
// (FilterLinePoe.vue). It waits a moment, so passing over rows shows nothing.
import { onBeforeUnmount } from 'vue'
import type { ParsedItem } from '@/parser'
import { FilterTag } from '@/web/price-check/filters/interfaces'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { hideTip, showTipAt } from '@/web/woke/ui/tooltip/tooltip'

/** A row that may have tiers: one rolled mod, not a property or a mercenary's gem. */
export function mayHaveTiers (f: StatFilter): boolean {
  return !f.mercenary && !!f.roll && f.sources.length === 1 && f.tag !== FilterTag.Property
}

export function useModTipHover (get: () => { item?: ParsedItem, filter: StatFilter }) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let on = false
  function enter (e: MouseEvent) {
    const el = e.currentTarget as HTMLElement
    const { item, filter } = get()
    if (!item || !mayHaveTiers(filter)) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      import('./mod-tip')
        .then(({ modTipFor }) => modTipFor(item, filter))
        .then(content => {
          if (!content || !el.isConnected || !el.matches(':hover')) return
          on = true
          showTipAt(el, content)
        })
        // No data or a stale chunk after an update: no tooltip, as before.
        .catch(() => {})
    }, 250)
  }
  function leave () {
    clearTimeout(timer)
    if (on) { on = false; hideTip() }
  }
  onBeforeUnmount(leave)
  return { enter, leave }
}
