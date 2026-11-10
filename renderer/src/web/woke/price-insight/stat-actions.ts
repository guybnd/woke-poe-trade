// Price check stat rows: splitting a pseudo total into the mods behind it, and
// the right-click menu. Nothing here searches, except the menu's swap lines,
// which are the ⇄ buttons' one search each.

import { inject, InjectionKey, provide, ref, Ref, toRaw, watch } from 'vue'
import type { ParsedItem } from '@/parser'
import { ModifierType } from '@/parser/modifiers'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { exclude, include, isHybrid, pickAtTier, soleMod, splitByMod, splitFilters, tierBound } from './pseudo-split'
import type { ParsedModifier } from '@/parser/advanced-mod-desc'
import { poeOn } from './window-style'
import { clusterResColumnStats } from '@/web/price-check/filters/pseudo/cluster-res'
import { openMenu, copyText, toast } from '@/web/woke/ui'
import type { MenuEntry } from '@/web/woke/ui'
import type { SwapController } from '@/web/woke/harvest-swap/useSwap'

interface Split {
  children: StatFilter[]
  /** The total's own tick before the split, put back when folding. */
  wasDisabled: boolean
  /** A hybrid's other lines moved under its row, each with the row it followed
   *  before the split (none: it was first) and its place then. */
  moved: Array<{ row: StatFilter, after: StatFilter | undefined, index: number }>
}

/** A line in a hybrid mod's box: the box's mod, and where in the box it sits. */
export interface HybridPart {
  mod: ParsedModifier
  first: boolean
  last: boolean
}

export interface StatActions {
  /** A pseudo total made of two or more mods. */
  canSplit: (filter: StatFilter) => boolean
  isSplit: (filter: StatFilter) => boolean
  /** A row that came out of a split. */
  isChild: (filter: StatFilter) => boolean
  toggleSplit: (filter: StatFilter) => void
  /** A line boxed with the rest of its hybrid mod, after a split. */
  hybridPart: (filter: StatFilter) => HybridPart | undefined
  /** Ticks every line of the row's one hybrid mod at its tier's worst roll. */
  searchMod: (filter: StatFilter) => void
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
  let hybrids = new WeakMap<StatFilter, HybridPart>()
  // Bumped on every split and fold, so rows that ask redraw.
  const version = ref(0)
  // A new item or another preset: fold every open split in the list it was
  // made in, so switching back finds that preset as it was.
  watch([item, stats], (_, [, oldStats]) => {
    if (oldStats) {
      // Latest first, so each fold finds the rows its split saw.
      for (const [raw, open] of [...splits].reverse()) {
        fold(oldStats, open)
        const total = oldStats.find(s => toRaw(s) === raw)
        if (total && isFilter(total)) total.disabled = open.wasDisabled
      }
    }
    splits = new Map()
    children = new WeakSet()
    hybrids = new WeakMap()
    version.value++
  })

  const isChild = (f: StatFilter) => version.value >= 0 && children.has(toRaw(f))
  const isSplit = (f: StatFilter) => version.value >= 0 && splits.has(toRaw(f))
  const canSplit = (f: StatFilter) =>
    // A local line two mods add up to (120% and 42% increased Energy Shield).
    (f.inTotal === true && f.sources.length >= 2 && !isChild(f)) ||
    (f.tag === ModifierType.Pseudo && f.option == null && !isChild(f) &&
    // A cluster jewel's resistance row folds its one line away too.
    (f.sources.length >= 2 || (f.sources.length === 1 && clusterResColumnStats(f) != null)))
  const hybridPart = (f: StatFilter) => version.value >= 0 ? hybrids.get(toRaw(f)) : undefined

  // A row of the list by its plain object.
  const at = (list: FilterOrGroup[], raw: StatFilter) => list.findIndex(s => toRaw(s) === raw)
  // The rows that are this one mod's alone, as plain objects.
  const rowsOf = (list: FilterOrGroup[], mod: ParsedModifier) =>
    list.filter(isFilter).map(s => toRaw(s) as StatFilter).filter(s => soleMod(s) === mod)

  // Takes a split's rows out of the list and puts a hybrid's moved lines back.
  function fold (list: FilterOrGroup[], open: Split) {
    for (const child of open.children) {
      const i = at(list, child)
      if (i >= 0) list.splice(i, 1)
      hybrids.delete(child)
    }
    for (const { row } of open.moved) {
      hybrids.delete(row)
      const i = at(list, row)
      if (i >= 0) list.splice(i, 1)
    }
    // Each after the row it followed (gone: at its old place). Last first, so
    // lines that followed the same row keep their order.
    for (const { row, after, index } of [...open.moved].sort((a, b) => b.index - a.index)) {
      const j = after ? at(list, after) : -1
      const to = (j >= 0) ? j + 1 : (after ? Math.min(index, list.length) : 0)
      list.splice(to, 0, row)
    }
  }

  function toggleSplit (f: StatFilter) {
    const list = stats.value
    const raw = toRaw(f)
    const open = splits.get(raw)
    if (open) {
      fold(list, open)
      f.disabled = open.wasDisabled
      splits.delete(raw)
      version.value++
      return
    }
    const byMod = f.inTotal === true
    const made = byMod
      ? splitByMod(f, item.value, percent())
      : splitFilters(f, list, item.value, percent())
    if (!made.length) {
      toast('Its mods are already listed on their own.')
      return
    }
    const wasDisabled = f.disabled
    // The list as it was, for putting moved lines back on fold.
    const orig = list.map(s => toRaw(s) as FilterOrGroup)
    const start = at(list, raw)
    list.splice(start + 1, 0, ...made)
    // Spliced in as reactive copies; remember the plain objects behind them.
    const added = list.slice(start + 1, start + 1 + made.length).map(s => toRaw(s) as StatFilter)
    for (const c of added) children.add(c)
    // A hybrid mod's row takes its mod's other lines under it, boxed together.
    const moved: Split['moved'] = []
    if (byMod) {
      const plan = added.map(child => {
        const mod = soleMod(child)
        const rows = (mod && isHybrid(mod))
          ? rowsOf(list, mod).filter(row => row !== child && !children.has(row) && !hybrids.has(row))
          : []
        return { child, mod, rows }
      })
      const moving = new Set(plan.flatMap(p => p.rows))
      for (const { rows } of plan) {
        for (const row of rows) {
          const index = orig.indexOf(row)
          // The nearest row above it that stays put.
          let k = index - 1
          while (k >= 0 && moving.has(orig[k] as StatFilter)) k--
          const before = orig[k]
          moved.push({ row, after: (before && isFilter(before)) ? before : undefined, index })
        }
      }
      for (const { child, mod, rows } of plan) {
        if (!mod || !rows.length) continue
        const box = [child]
        for (const row of rows) {
          const [r] = list.splice(at(list, row), 1)
          list.splice(at(list, child) + box.length, 0, r)
          box.push(row)
        }
        box.forEach((row, k) => hybrids.set(row, { mod, first: k === 0, last: k === box.length - 1 }))
      }
    }
    splits.set(raw, { children: added, wasDisabled, moved })
    f.disabled = true
    version.value++
  }

  function searchMod (f: StatFilter) {
    const mod = soleMod(f)
    if (!mod) return
    // Its share of a line it adds up to with another mod comes out first.
    for (const s of [...stats.value]) {
      if (isFilter(s) && s.inTotal && canSplit(s) && !isSplit(s) && s.sources.some(src => toRaw(src.modifier) === mod)) {
        toggleSplit(s)
      }
    }
    for (const row of stats.value) {
      if (isFilter(row) && soleMod(row) === mod) pickAtTier(row)
    }
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
    const mod = soleMod(f)
    // PoE mode only: Standard hides the local rows such a search ticks.
    if (poeOn.value && mod && isHybrid(mod)) {
      const name = [mod.info.tier != null ? `T${mod.info.tier}` : '', mod.info.name ?? ''].filter(Boolean).join(' ')
      items.push({ label: `Search this hybrid mod${name ? ` (${name})` : ''}`, icon: 'fas fa-link', action: () => searchMod(f) })
    }
    if (canSplit(f)) {
      items.push(isSplit(f)
        ? { label: 'Fold back into the total', icon: 'fas fa-compress', action: () => toggleSplit(f) }
        : { label: f.sources.length > 1 ? `Split into its ${f.sources.length} mods` : 'Show the mod behind it', icon: 'fas fa-expand', action: () => toggleSplit(f) })
    }
    items.push({
      label: 'Copy mod text',
      icon: 'far fa-copy',
      action: () => { copyText(rollText(f)).then(ok => { if (ok) toast('Copied') }).catch(() => {}) }
    })
    openMenu(e, items)
  }

  const actions: StatActions = { canSplit, isSplit, isChild, toggleSplit, hybridPart, searchMod, menu }
  provide(KEY, actions)
  return actions
}

export function useStatActions (): StatActions | undefined {
  return inject(KEY, undefined)
}
