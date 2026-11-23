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
import { buildTip, dropOf, dropSource, kindOfNinjaType, packFiles, randomDropsFirst } from './tip-content'
import type { TipKind, TipModel, TipPack } from './tip-content'
import { hideTip, marketFromRow, onTipHide, showTipAt } from './tooltip'
import { offerItem, openItemMenu } from './item-menu'
import { kindOfName, uniqueModLines } from './item-menu-logic'
import type { ItemMenuRef, UniqueModLines } from './item-menu-logic'
import { dataFileUrl, onSharedDataChange } from '../../app/live-data'
import { usePrice } from '../../shared/price'
import type { TipBaseUnique, TipContent, TipEffect, TipMarket } from './tooltip'

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
  // How many of it (a stack, a stash line): the price strip adds their value.
  count?: number
  // The row's right-click is its own (the drop counter's take-one-back): no item menu.
  noMenu?: boolean
  // Shown as it is, with no lookup: an item whose own mods are known (a sold
  // item from the trade history).
  content?: TipContent
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

// Unique mods, by name: the tooltip's unique file.
export async function loadTipUniques (): Promise<TipPack['uniques'] | null> {
  await loadFile('uniques')
  return pack.uniques ?? null
}

// A unique's mods for the price check (item-menu-logic's virtualUnique), or
// null when the data can't load: the check then goes on without them.
export async function loadUniqueMods (name: string, variant?: string): Promise<UniqueModLines | null> {
  const uniques = await loadTipUniques().catch(() => null)
  return uniqueModLines(uniques?.[name], variant)
}

// The mod each unique leaves as a Vestigial implicit, for Search.
export async function loadTipVestigial (): Promise<TipPack['vestigial'] | null> {
  await loadFile('vestigial')
  return pack.vestigial ?? null
}

// Where uniques come from when it isn't a random drop: the tooltip's drop file.
export async function loadTipDrops (): Promise<TipPack['drops'] | null> {
  await loadFile('drops')
  return pack.drops ?? null
}

// Gems by level (stats, requirements): the tooltip's gem file.
export async function loadTipGems (): Promise<TipPack['gems'] | null> {
  await loadFile('gems')
  return pack.gems ?? null
}

// Base items' defences, weapon damage and requirements: the tooltip's base file.
export async function loadTipBases (): Promise<TipPack['bases'] | null> {
  await loadFile('bases')
  return pack.bases ?? null
}

// Card rewards and stack sizes, currency texts: the tooltip's item file.
export async function loadTipItems (): Promise<TipPack['items'] | null> {
  await loadFile('items')
  return pack.items ?? null
}

const NINJA_NS: Record<TipKind, string> = { unique: 'UNIQUE', gem: 'GEM', card: 'DIVINATION_CARD', item: 'ITEM' }

// Made on the first hover: global state, so one is enough.
let price: ReturnType<typeof usePrice> | null = null

export function marketFor (ref: ItemTipRef, kind: TipKind): TipMarket | null {
  if (ref.noPrice) return null
  if (ref.prices) return { chaos: ref.prices.low, change: null, graph: [], range: ref.prices }
  const ns = ref.type === 'Beast' ? 'CAPTURED_BEAST' : NINJA_NS[kind]
  // The row every window takes for this name; a rolled unique's unidentified
  // price only from a quote on hand: hovering never spends a trade search.
  price ??= usePrice()
  const found = price.priceOf(ref.name, { ns, variant: ref.variant })
  if (!found) return null
  const market = marketFromRow(found.row, ref)
  return found.unid ? { ...market, unid: found.unid } : market
}

// Marks the uniques on a base that won't turn up as a random drop on it, with
// where they come from, and lists them after the ones that do.
function withDrops (uniques: TipBaseUnique[], drops: TipPack['drops']): TipBaseUnique[] {
  const marked = uniques.map(u => {
    const drop = dropSource(dropOf(drops, u.name))
    return drop ? { ...u, drop } : u
  })
  return randomDropsFirst(marked, u => !!u.drop)
}

// A Viscera (3.30): poe.ninja prices each of its effects, so the tooltip lists
// them all; one price for the name would only be one effect's.
function visceraTip (ref: ItemTipRef): { model: TipModel, market: null, effects: TipEffect[] } {
  const ninja = usePoeninja()
  ninja.queuePricesFetch()
  const effects = ninja.findPricesByName('ITEM', ref.name)
    .filter(info => info.variant)
    .map(info => ({ text: info.variant!, chaos: info.chaos, hovered: info.variant === ref.variant }))
    .sort((a, b) => b.chaos - a.chaos)
  const base = effects.length === 1 ? 'Viscera · 1 effect' : `Viscera · ${effects.length} effects`
  return { model: { name: ref.name, base, frame: 'normal', sections: [] }, market: null, effects }
}

async function tipFor (ref: ItemTipRef): Promise<{ model: TipModel | null, market: TipMarket | null, uniques?: TipBaseUnique[], effects?: TipEffect[] }> {
  if (ref.type === 'Viscera') return visceraTip(ref)
  const listed = ref.uniques?.()
  if (listed?.length) {
    await loadFile('drops')
    const uniques = withDrops(listed, pack.drops)
    usePoeninja().queuePricesFetch()
    // The dearest one in full (restricted or not), then the list, random drops first.
    // With no prices yet there's no telling which is best, so just the list.
    const header = { name: ref.name, base: `${uniques.length} uniques on this base`, frame: 'unique' as const, sections: [] }
    if (listed[0].chaos == null && listed.length > 1) return { model: header, market: null, uniques }
    await Promise.all(packFiles('unique').map(loadFile))
    const model = buildTip(pack, { name: listed[0].name, kind: 'unique', base: ref.name, atBase: ref.name })
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

// The row whose tooltip is up or on its way.
let live: HTMLElement | null = null

// Any scroll hides the tooltip (GameTooltip), also one that ends after the
// pointer reached a row (Ctrl+Space scrolling a row into view, a wheel still
// settling). The row is still the hovered one, so no mouseover comes and it
// stayed without a tooltip until the pointer left it. Now, once the scroll
// stops (or the pointer moves), it comes back if the row is still shown and
// under the pointer. Any other hide (a click, a menu, blur, the overlay
// closing) is final, as before.
const SCROLL_SETTLE_MS = 150
let stale: HTMLElement | null = null
let settle: ReturnType<typeof setTimeout> | undefined

function cancel (scrolled = false) {
  seq++
  clearTimeout(timer)
  clearTimeout(settle)
  const was = live
  live = null
  if (scrolled && hovered && (was === hovered || stale === hovered)) {
    stale = hovered
    settle = setTimeout(reshow, SCROLL_SETTLE_MS)
  } else stale = null
}
onTipHide(cancel)

function reshow () {
  const el = stale
  stale = null
  // :hover is the browser's own: it clears when the pointer leaves the window
  // or the row slides away from under it.
  if (el && el === hovered && document.hasFocus() && el.offsetParent !== null && el.matches(':hover')) enter(el)
}

// A row closed while the pointer is still on it (hidden, re-sorted, right-clicked)
// stays closed until the pointer goes somewhere else.
let closed: HTMLElement | null = null

function leave () {
  closed = hovered
  hovered = null
  clearInterval(watch)
  hideTip()
}

// A row hidden without being removed (its panel closed, the overlay toggled) never
// fires mouseleave, which left its tooltip on screen. While one is up, check the row
// is still shown and under the pointer.
let watch: ReturnType<typeof setInterval> | undefined
function watchHovered () {
  clearInterval(watch)
  watch = setInterval(() => {
    const el = hovered
    if (!el) { clearInterval(watch); return }
    if (!el.isConnected || el.offsetParent === null || !el.matches(':hover')) leave()
  }, 400)
}

function enter (el: HTMLElement) {
  const ref = refs.get(el)
  hovered = el
  watchHovered()
  if (!ref?.name) { hideTip(); return }
  cancel()
  live = el
  const mine = seq
  const own = ref.content
  if (own) {
    timer = setTimeout(() => { if (mine === seq && el.isConnected) showTipAt(el, own) }, SHOW_DELAY_MS)
    return
  }
  timer = setTimeout(() => {
    tipFor(ref).then(({ model, market, uniques, effects }) => {
      if (mine !== seq || !el.isConnected) return
      const note = ref.note ? [ref.note.split('\n').map(text => [{ text, tone: 'dim' as const }])] : []
      if (model && note.length) model = { ...model, sections: [...model.sections, ...note] }
      if (model) showTipAt(el, { kind: 'lookup', model, market, uniques, effects })
      else if (ref.fallback) showTipAt(el, ref.fallback)
      // No text for it, but a price or the caller's note is still worth showing.
      else if (market || note.length) showTipAt(el, { kind: 'lookup', model: { name: ref.name, frame: 'normal', sections: note }, market })
      else hideTip()
    }).catch(() => {
      if (mine !== seq) return
      if (ref.fallback && el.isConnected) showTipAt(el, ref.fallback)
      else hideTip()
    })
  }, SHOW_DELAY_MS)
}

// One pair of listeners for the whole page, not three per row: the innermost
// element with v-item-tip under the pointer is the hovered one. (Per-row
// listeners put long lists over the perf budget's listener count.)
function tipEl (node: EventTarget | null): HTMLElement | null {
  let el = node instanceof Element ? node : node instanceof Node ? node.parentElement : null
  for (; el; el = el.parentElement) {
    if (refs.has(el as HTMLElement)) return el as HTMLElement
  }
  return null
}

let watchingHover = false
function watchHover () {
  if (watchingHover) return
  watchingHover = true
  document.addEventListener('mouseover', (e) => {
    const el = tipEl(e.target)
    if (el === hovered) return
    if (el && el === closed) return
    closed = null
    if (hovered) leave()
    closed = null
    if (el) enter(el)
  })
  // Out of the window: no mouseover follows.
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget && hovered) { leave(); closed = null }
  })
  document.addEventListener('mousemove', () => { if (stale) reshow() }, { passive: true })
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
  if (!ref?.name || ref.noMenu) return null
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
    if (!tipEl(e.target)) return
    // The menu opens where the tooltip would be in the way.
    leave()
    const owner = menuOwner(e.target)
    if (!owner) return
    const ref = menuRef(refs.get(owner))
    offerItem(e, ref)
    // After the handlers inside the item, at the item itself, as a listener of
    // its own would: the item's menu alone, unless they opened one. A row or
    // window around it that opens its own later replaces it, still with the
    // item on top (and the window menu skips a click already handled). Only
    // for this click, so rows don't each keep a listener.
    const open = (ev: Event) => openItemMenu(ev as MouseEvent, ref)
    owner.addEventListener('contextmenu', open, { once: true })
    setTimeout(() => owner.removeEventListener('contextmenu', open), 0)
  }, true)
}

// The innermost item under the pointer that has a name, for its menu; none
// inside a row whose right-click is its own (noMenu).
function menuOwner (target: EventTarget | null): HTMLElement | null {
  for (let el = tipEl(target); el; el = tipEl(el.parentElement)) {
    const ref = refs.get(el)
    if (ref?.noMenu) return null
    if (ref?.name) return el
  }
  return null
}

// Marks an element that shows the item tooltip, for the e2e hover gate
// (testing/e2e/tip-audit.ts): a row naming an item must be inside one.
function mark (el: HTMLElement, ref: ItemTipRef | null | undefined) {
  const on = !!ref?.name
  if (on !== el.hasAttribute('data-item-tip')) el.toggleAttribute('data-item-tip', on)
}

export const vItemTip: ObjectDirective<HTMLElement, ItemTipRef | null | undefined> = {
  mounted (el, binding) {
    watchHoverZones()
    watchRightClicks()
    watchHover()
    refs.set(el, binding.value)
    mark(el, binding.value)
  },
  updated (el, binding) {
    const before = refs.get(el)
    const after = binding.value
    refs.set(el, after)
    mark(el, after)
    // A list re-sorted under the pointer now has a different item here.
    if (hovered === el && (before?.name !== after?.name || before?.variant !== after?.variant)) leave()
  },
  beforeUnmount (el) {
    refs.delete(el)
    if (hovered === el) leave()
  }
}
