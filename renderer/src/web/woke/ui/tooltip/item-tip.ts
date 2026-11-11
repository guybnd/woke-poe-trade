// The item tooltip for any screen: put v-item-tip on a row or name.
//
//   <div v-item-tip="{ name: m.name, type: m.type, variant: m.variant }">
//
// `type` is the poe.ninja row type; leave it out and it's worked out from the
// name. The text loads from public/data/tips on the first hover.
import type { ObjectDirective } from 'vue'
import { ITEM_BY_REF } from '@/assets/data'
import { Host } from '@/web/background/IPC'
import { usePoeninja } from '@/web/background/Prices'
import { buildTip, kindOfNinjaType, packFiles } from './tip-content'
import type { TipKind, TipModel, TipPack } from './tip-content'
import { hideTip, onTipHide, showTipAt } from './tooltip'
import { offerItem, openItemMenu } from './item-menu'
import { kindOfName } from './item-menu-logic'
import type { ItemMenuRef } from './item-menu-logic'
import { dataFileUrl, onSharedDataChange } from '../../app/live-data'
import type { TipBaseUnique, TipContent, TipMarket } from './tooltip'

export interface ItemTipRef {
  name: string
  type?: string
  variant?: string
  // For a base in a filter's unique tiers: what it can drop as. Read on hover.
  uniques?: () => TipBaseUnique[]
  // A name with several prices: the strip gives the range, not one of them.
  prices?: { low: number, high: number, count: number }
  // Just the item's text, where a price isn't the point.
  noPrice?: boolean
  // A last line under the text, such as where to get a gem.
  note?: string
  // Shown when the tooltip data has nothing for the name.
  fallback?: TipContent
  // The right-click menu's item, when it differs from the tooltip's.
  menu?: ItemMenuRef
}

const SHOW_DELAY_MS = 60

const pack: TipPack = {}
const loading = new Map<keyof TipPack, Promise<void>>()
// woke: newer tooltips downloaded: read them on the next hover.
// A read still running from before is dropped, not kept.
let generation = 0
onSharedDataChange(() => {
  generation++
  loading.clear()
  for (const key of Object.keys(pack)) Reflect.deleteProperty(pack, key)
})

function loadFile (file: keyof TipPack): Promise<void> {
  let job = loading.get(file)
  if (!job) {
    const mine = generation
    job = fetch(dataFileUrl(`tips/${file}.json`))
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then(data => { if (mine === generation) pack[file] = data })
      // Leaves the file out so the next hover tries again.
      .catch(() => { if (mine === generation) loading.delete(file) })
    loading.set(file, job)
  }
  return job
}

const NINJA_NS: Record<TipKind, string> = { unique: 'UNIQUE', gem: 'GEM', card: 'DIVINATION_CARD', item: 'ITEM' }

export function marketFor (ref: ItemTipRef, kind: TipKind): TipMarket | null {
  if (ref.noPrice) return null
  if (ref.prices) return { chaos: ref.prices.low, change: null, graph: [], range: ref.prices }
  const ninja = usePoeninja()
  ninja.queuePricesFetch()
  const ns = ref.type === 'Beast' ? 'CAPTURED_BEAST' : NINJA_NS[kind]
  const info = ninja.findPriceByQuery({ ns, name: ref.name, variant: ref.variant || undefined }) ??
    (ref.variant ? null : ninja.findPriceByName(ns, ref.name))
  if (!info) return null
  const graph = (info.graph ?? []).filter((v): v is number => v != null)
  return {
    chaos: info.chaos,
    variant: ref.variant ? undefined : info.variant,
    // The last point is the % change over the whole line.
    change: graph.length ? graph[graph.length - 1] / 100 : null,
    graph
  }
}

async function tipFor (ref: ItemTipRef): Promise<{ model: TipModel | null, market: TipMarket | null, uniques?: TipBaseUnique[] }> {
  const uniques = ref.uniques?.()
  if (uniques?.length) {
    usePoeninja().queuePricesFetch()
    // The list comes most valuable first: that one in full, then all of them.
    // With no prices yet there's no telling which is best, so just the list.
    const header = { name: ref.name, base: `${uniques.length} uniques on this base`, frame: 'unique' as const, sections: [] }
    if (uniques[0].chaos == null && uniques.length > 1) return { model: header, market: null, uniques }
    await Promise.all(packFiles('unique').map(loadFile))
    const model = buildTip(pack, { name: uniques[0].name, kind: 'unique', base: ref.name, atBase: ref.name })
    return { model, market: null, uniques }
  }
  const kind = ref.type ? kindOfNinjaType(ref.type) : kindOfName(ref.name)
  await Promise.all(packFiles(kind).map(loadFile))
  const base = kind === 'unique' ? ITEM_BY_REF('UNIQUE', ref.name)?.[0]?.unique?.base : undefined
  const model = buildTip(pack, { name: ref.name, kind, variant: ref.variant, base })
  return { model, market: marketFor(ref, kind) }
}

// ---- hover ----

let seq = 0
let timer: ReturnType<typeof setTimeout> | undefined
let hovered: HTMLElement | null = null
const refs = new WeakMap<HTMLElement, ItemTipRef | null | undefined>()

function cancel () {
  seq++
  clearTimeout(timer)
}
onTipHide(cancel)

function leave () {
  hovered = null
  hideTip()
}

function enter (e: Event) {
  const el = e.currentTarget as HTMLElement
  const ref = refs.get(el)
  hovered = el
  if (!ref?.name) { hideTip(); return }
  cancel()
  const mine = seq
  timer = setTimeout(() => {
    tipFor(ref).then(({ model, market, uniques }) => {
      if (mine !== seq || !el.isConnected) return
      if (model && ref.note) model = { ...model, sections: [...model.sections, ref.note.split('\n').map(text => [{ text, tone: 'dim' as const }])] }
      if (model) showTipAt(el, { kind: 'lookup', model, market, uniques })
      else if (ref.fallback) showTipAt(el, ref.fallback)
      // No text for it, but a price is still worth showing.
      else if (market) showTipAt(el, { kind: 'lookup', model: { name: ref.name, frame: 'normal', sections: [] }, market })
      else hideTip()
    }).catch(() => {
      if (mine !== seq) return
      if (ref.fallback && el.isConnected) showTipAt(el, ref.fallback)
      else hideTip()
    })
  }, SHOW_DELAY_MS)
}

// Dock cards take clicks while the game has focus. Leaving one makes the window
// click-through, so its mouseleave can go missing; the main process still knows.
let watchingZones = false
function watchHoverZones () {
  if (watchingZones) return
  watchingZones = true
  Host.onEvent('MAIN->OVERLAY::woke-hover', (e) => {
    if (!e.inside && hovered && !hovered.closest('[data-w-panel]')) leave()
  })
}

// ---- right-click ----

function menuRef (ref: ItemTipRef | null | undefined): ItemMenuRef | null {
  if (!ref?.name) return null
  if (ref.menu) return ref.menu
  // A base's unique list or a price range isn't one item's price.
  return { name: ref.name, type: ref.type, variant: ref.variant, noPrice: ref.noPrice || !!ref.prices || !!ref.uniques }
}

// Before the row's own handlers: whatever menu this click opens shows the item.
// One listener for the whole page, capturing, so it runs first; the innermost
// item under the mouse wins.
let offering = false
function watchRightClicks () {
  if (offering) return
  offering = true
  document.addEventListener('contextmenu', (e) => {
    for (let el = e.target as Element | null; el; el = el.parentElement) {
      const ref = refs.get(el as HTMLElement)
      if (ref?.name) { offerItem(e, menuRef(ref)); return }
    }
  }, true)
}

// After them: nothing opened a menu, so the item's alone. An ancestor row that
// opens its own later replaces it, still with the item on top.
function menu (e: Event) {
  // The menu opens where the tooltip would be in the way.
  leave()
  openItemMenu(e as MouseEvent, menuRef(refs.get(e.currentTarget as HTMLElement)))
}

export const vItemTip: ObjectDirective<HTMLElement, ItemTipRef | null | undefined> = {
  mounted (el, binding) {
    watchHoverZones()
    watchRightClicks()
    refs.set(el, binding.value)
    el.addEventListener('mouseenter', enter)
    el.addEventListener('mouseleave', leave)
    el.addEventListener('contextmenu', menu)
  },
  updated (el, binding) {
    const before = refs.get(el)
    const after = binding.value
    refs.set(el, after)
    // A list re-sorted under the pointer now has a different item here.
    if (hovered === el && (before?.name !== after?.name || before?.variant !== after?.variant)) leave()
  },
  beforeUnmount (el) {
    el.removeEventListener('mouseenter', enter)
    el.removeEventListener('mouseleave', leave)
    el.removeEventListener('contextmenu', menu)
    if (hovered === el) leave()
  }
}
