// Price check stat rows: splitting a pseudo total into the mods behind it, and
// the right-click menu. Nothing here searches, except the menu's swap lines,
// which are the ⇄ buttons' one search each.

import { inject, InjectionKey, provide, ref, Ref, toRaw, watch } from 'vue'
import type { ParsedItem } from '@/parser'
import { ModifierType } from '@/parser/modifiers'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { exclude, include, splitFilters, tierBound } from './pseudo-split'
import { openMenu, copyText, toast } from '@/web/woke/ui'
import type { MenuEntry } from '@/web/woke/ui'
import type { SwapController } from '@/web/woke/harvest-swap/useSwap'

interface Split {
  children: StatFilter[]
  /** The total's own tick before the split, put back when folding. */
  wasDisabled: boolean
}

export interface StatActions {
  /** A pseudo total made of two or more mods. */
  canSplit: (filter: StatFilter) => boolean
  isSplit: (filter: StatFilter) => boolean
  /** A row that came out of a split. */
  isChild: (filter: StatFilter) => boolean
  toggleSplit: (filter: StatFilter) => void
  menu: (e: MouseEvent, filter: StatFilter) => void
}

const KEY: InjectionKey<StatActions> = Symbol('woke-stat-actions')

const isFilter = (s: FilterOrGroup): s is StatFilter => !('group' in s && s.group)

function rollText (filter: StatFilter): string {
  const v = filter.roll?.value
  return v == null ? filter.text : filter.text.replace('#', String(v))
}

export function provideStatActions (
  item: Ref<ParsedItem>,
  stats: Ref<FilterOrGroup[]>,
  percent: () => number,
  swap: SwapController | undefined
): StatActions {
  // Keyed by the plain objects: rows reach here as reactive copies.
  let splits = new Map<StatFilter, Split>()
  let children = new WeakSet<StatFilter>()
  // Bumped on every split and fold, so rows that ask redraw.
  const version = ref(0)
  // A new item or another preset: fold every open split in the list it was
  // made in, so switching back finds that preset as it was.
  watch([item, stats], (_, [, oldStats]) => {
    if (oldStats) {
      for (const [raw, open] of splits) {
        for (const child of open.children) {
          const at = oldStats.findIndex(s => toRaw(s) === child)
          if (at >= 0) oldStats.splice(at, 1)
        }
        const total = oldStats.find(s => toRaw(s) === raw)
        if (total && isFilter(total)) total.disabled = open.wasDisabled
      }
    }
    splits = new Map()
    children = new WeakSet()
    version.value++
  })

  const isChild = (f: StatFilter) => version.value >= 0 && children.has(toRaw(f))
  const isSplit = (f: StatFilter) => version.value >= 0 && splits.has(toRaw(f))
  const canSplit = (f: StatFilter) =>
    f.tag === ModifierType.Pseudo && f.option == null && f.sources.length >= 2 && !isChild(f)

  function toggleSplit (f: StatFilter) {
    const list = stats.value
    const raw = toRaw(f)
    const open = splits.get(raw)
    if (open) {
      for (const child of open.children) {
        const at = list.findIndex(s => toRaw(s) === child)
        if (at >= 0) list.splice(at, 1)
      }
      f.disabled = open.wasDisabled
      splits.delete(raw)
      version.value++
      return
    }
    const made = splitFilters(f, list, item.value, percent())
    if (!made.length) {
      toast('Its mods are already listed on their own.')
      return
    }
    const at = list.findIndex(s => toRaw(s) === raw)
    list.splice(at + 1, 0, ...made)
    // Spliced in as reactive copies; remember the plain objects behind them.
    const added = list.slice(at + 1, at + 1 + made.length).map(s => toRaw(s) as StatFilter)
    for (const c of added) children.add(c)
    splits.set(raw, { children: added, wasDisabled: f.disabled })
    f.disabled = true
    version.value++
  }

  function menu (e: MouseEvent, f: StatFilter) {
    const items: MenuEntry[] = []
    items.push({
      label: 'Search only this',
      icon: 'fas fa-filter',
      action: () => {
        for (const s of stats.value) {
          if (isFilter(s)) s.disabled = (s !== f)
          else s.meta.disabled = true
        }
        f.disabled = false
      }
    })
    if (f.tag === ModifierType.Explicit || f.tag === ModifierType.Fractured || f.tag === ModifierType.Crafted) {
      items.push(f.not
        ? { label: 'Include it again', icon: 'fas fa-plus', action: () => include(f) }
        : { label: 'Exclude it (items without)', icon: 'fas fa-ban', action: () => exclude(f) })
    }

    const roll = f.roll
    if (roll && !f.not) {
      // Where lower is better the bound that matters is the max, as the
      // price check's own Low/Approx/High set it.
      const lowerBetter = roll.better === -1
      const word = lowerBetter ? 'Max' : 'Min'
      const setBound = (v: number) => {
        if (lowerBetter) { roll.max = v; roll.min = '' } else { roll.min = v; roll.max = '' }
        f.disabled = false
      }
      items.push({ separator: true })
      items.push({ label: `${word}: my roll (${roll.value})`, action: () => setBound(roll.value) })
      const tier = tierBound(f)
      if (tier != null) {
        items.push({ label: `${word}: ${lowerBetter ? 'top' : 'bottom'} of tier (${tier})`, action: () => setBound(tier) })
      }
      items.push({ label: 'Clear min and max', action: () => { roll.min = ''; roll.max = '' } })
    }

    const cand = swap?.candidateFor(f)
    if (swap && cand) {
      items.push({ separator: true })
      if (!cand.family.random) {
        items.push({ label: 'Price as any element', keys: '1 search', action: () => { swap.run(cand, 'any').catch(() => {}) } })
        for (const t of cand.targets) {
          items.push({ label: `Price as ${t[0].toUpperCase()}${t.slice(1)}`, keys: '1 search', action: () => { swap.run(cand, t).catch(() => {}) } })
        }
      } else {
        items.push({ label: 'Price the ducat swap', keys: '1 search', action: () => { swap.run(cand, 'any').catch(() => {}) } })
      }
    }

    items.push({ separator: true })
    if (canSplit(f)) {
      items.push(isSplit(f)
        ? { label: 'Fold back into the total', icon: 'fas fa-compress', action: () => toggleSplit(f) }
        : { label: `Split into its ${f.sources.length} mods`, icon: 'fas fa-expand', action: () => toggleSplit(f) })
    }
    items.push({
      label: 'Copy mod text',
      icon: 'far fa-copy',
      action: () => { copyText(rollText(f)).then(ok => { if (ok) toast('Copied') }).catch(() => {}) }
    })
    openMenu(e, items)
  }

  const actions: StatActions = { canSplit, isSplit, isChild, toggleSplit, menu }
  provide(KEY, actions)
  return actions
}

export function useStatActions (): StatActions | undefined {
  return inject(KEY, undefined)
}
