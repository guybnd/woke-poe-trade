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
import { retireHint } from '../../shared/hints'
import { offerItem, openItemMenu } from './item-menu'
import { kindOfName, uniqueModLines } from './item-menu-logic'
import type { ItemMenuRef, UniqueModLines } from './item-menu-logic'
import { dataFileUrl, onSharedDataChange } from '../../app/live-data'
import { usePrice } from '../../shared/price'
import { uniquesOnBase } from '../../shared/uniques-on-base'
import { loadModTiers, tierClassKey } from './mod-tiers'
import type { GemTable } from '../../search/lookups/gems'
import { heldText } from '../../shared/price-trust'
import { formatChaos } from '../format'
import type { TipBaseUnique, TipContent, TipEffect, TipMarket } from './tooltip'

// The item tooltip's key line (GameTooltip.vue): gone after the first
// right-click on an item.
export const ITEM_MENU_HINT = 'item-right-click'

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
// With the uniques poe.ninja doesn't list (unique-extras), merged once.
let allUniques: { from: TipPack['uniques'], extras: TipPack['unique-extras'], all: NonNullable<TipPack['uniques']> } | null = null
export async function loadTipUniques (): Promise<TipPack['uniques'] | null> {
  await Promise.all([loadFile('uniques'), loadFile('unique-extras')])
  const from = pack.uniques
  if (!from) return null
  const extras = pack['unique-extras']
  if (allUniques?.from !== from || allUniques.extras !== extras) allUniques = { from, extras, all: { ...extras, ...from } }
  return allUniques.all
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
  // A rolled unique by name alone (no variant): poe.ninja's one price is a
  // guess at a hidden roll. Its saved unidentified trade price, else "varies"
  // (Guy's pick C1, 2026-11-24).
  if (kind === 'unique' && !ref.variant) {
    const unid = price.unidOf(ref.name)
    if (unid) return { chaos: unid.chaos, change: null, graph: [], unid, unidOnly: true }
    if (price.isVariable(ref.name)) return { chaos: 0, change: null, graph: [], varies: true }
  }
  const found = price.priceOf(ref.name, { ns, variant: ref.variant })
  if (!found) return null
  const market = marketFromRow(found.row, ref)
  // The tooltip shows poe.ninja's price as it is, and says when it looks fake.
  if (found.held) market.doubt = heldText(found.held, c => formatChaos(c, price!.divine.value))
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

// A captured beast: its Bestiary recipes, so a beast in a list says why it's
// there (Farric Lynx Alpha beside Exalted Orb: it adds a suffix).
async function beastTip (ref: ItemTipRef): Promise<{ model: TipModel, market: TipMarket | null }> {
  const { beastCrafts } = await import('./beast-crafts')
  const lines = await beastCrafts(ref.name)
  const sections = lines.length
    ? [[[{ text: 'Blood Altar recipes', tone: 'label' as const }]], lines.map(l => [{ text: l.text, tone: l.recipe ? 'mod' as const : 'dim' as const }])]
    : []
  return { model: { name: ref.name, base: 'Captured beast', frame: 'normal', sections }, market: marketFor(ref, 'item') }
}

async function tipFor (ref: ItemTipRef): Promise<{ model: TipModel | null, market: TipMarket | null, uniques?: TipBaseUnique[], effects?: TipEffect[] }> {
  if (ref.type === 'Viscera') return visceraTip(ref)
  if (ref.type === 'Beast') return beastTip(ref)
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
  let model = buildTip(pack, { name: ref.name, kind, variant: ref.variant, base })
  const market = marketFor(ref, kind)
  if (model && kind === 'card') model = await withCardRarity(model, ref.name, market)
  if (model && kind === 'gem') model = await withGemExtras(model, ref)
  if (model && kind === 'unique') model = await withUniqueExtras(model, ref, market)
  if (kind === 'item' && / Map$/.test(ref.name)) model = await withMapCards(model, ref.name)
  if (model && kind === 'item' && /^(?:\w+ )?Essence of /.test(ref.name)) model = await withEssence(model, ref.name)
  if (model && kind === 'item' && pack.bases?.[ref.name]) return await withBaseExtras(model, ref, market)
  if (model && (kind === 'item' || kind === 'card')) model = await withHeld(model, ref.name, market)
  return { model, market }
}

// "You have 34 · 1.2 div" from Net worth's last stash read (Guy's pick I9).
async function withHeld (model: TipModel, name: string, market: TipMarket | null): Promise<TipModel> {
  try {
    const { heldCount } = await import('./held')
    const n = await heldCount(name)
    if (!n) return model
    price ??= usePrice()
    const worth = market && !market.range && !market.varies ? market.chaos * n : null
    const line = [
      { text: 'You have ', tone: 'label' as const },
      { text: n.toLocaleString('en-US'), tone: 'value' as const },
      ...(worth ? [{ text: ` · ${formatChaos(worth, price.divine.value)}`, tone: 'label' as const }] : [])
    ]
    return { ...model, sections: [...model.sections, [line]] }
  } catch {
    return model
  }
}

// An essence: the mod it forces on each slot (Guy's pick I6, essence-tip.ts).
async function withEssence (model: TipModel, name: string): Promise<TipModel> {
  try {
    const [{ essenceSections }] = await Promise.all([import('./essence-tip'), loadFile('essences')])
    const sections = essenceSections(pack.essences?.[name])
    return sections.length ? { ...model, sections: [...model.sections, ...sections] } : model
  } catch {
    return model
  }
}

// A map by name: its tier and the cards that drop there, dearest first, as
// Map history and Card drops show it (Guy's pick I8). Without the drop data
// the tooltip shows as it was.
async function withMapCards (model: TipModel | null, map: string): Promise<TipModel | null> {
  try {
    const { loadCardDrops, mapTip } = await import('../../card-drops/card-drops')
    const data = await loadCardDrops()
    if (!data || data.maps[map] == null) return model
    price ??= usePrice()
    const p = price
    const tip = mapTip(data, map, card => p.priceOf(card, { ns: 'DIVINATION_CARD' })?.chaos ?? null, c => formatChaos(c, p.divine.value))
    return model ? { ...model, base: model.base ?? tip.model.base, sections: [...model.sections, ...tip.model.sections] } : tip.model
  } catch {
    return model
  }
}

// A gear base: the item level its best tiers need, and the uniques it drops
// as with their prices, ones that aren't random drops marked (Guy's pick I7).
async function withBaseExtras (model: TipModel, ref: ItemTipRef, market: TipMarket | null): Promise<{ model: TipModel, market: TipMarket | null, uniques?: TipBaseUnique[] }> {
  const category = ITEM_BY_REF('ITEM', ref.name)?.[0]?.craftable?.category
  // A flask, jewel or ward base has no tier line, but still its uniques.
  const key = tierClassKey(category, pack.bases?.[ref.name])
  if (key) {
    try {
      const [{ topTierLine }, tiers] = await Promise.all([import('./base-tip-extras'), loadModTiers()])
      const line = tiers ? topTierLine(tiers, key) : null
      if (line) model = { ...model, sections: [...model.sections, [line]] }
    } catch {}
  }
  await loadFile('drops')
  const names = uniquesOnBase(ref.name)
  if (!names.length) return { model, market }
  price ??= usePrice()
  const p = price
  const listed = names.map((name): TipBaseUnique => {
    const found = p.isVariable(name) ? null : p.priceOf(name, { ns: 'UNIQUE' })
    return { name, chaos: found?.chaos ?? null, grade: 'unknown', label: '', thin: false }
  }).sort((a, b) => (b.chaos ?? -1) - (a.chaos ?? -1))
  return { model, market, uniques: withDrops(listed, pack.drops) }
}

// A unique's Foulborn swap, Vestigial implicit and the cards that give it
// (unique-tip-extras.ts). Without the data the tooltip shows as it was.
async function withUniqueExtras (model: TipModel, ref: ItemTipRef, market: TipMarket | null): Promise<TipModel> {
  try {
    const [{ uniqueExtraSections }] = await Promise.all([import('./unique-tip-extras'), loadFile('items'), loadFile('vestigial')])
    price ??= usePrice()
    const p = price
    // A card gives a random roll: one variant's price isn't what the set makes.
    const rolled = !!ref.variant && (pack.uniques?.[ref.name]?.v.length ?? 0) > 1
    const one = market && !rolled && !market.varies && !market.unidOnly && !market.range ? market.chaos : null
    const sections = uniqueExtraSections(ref, pack, {
      card: name => p.priceOf(name, { ns: 'DIVINATION_CARD' })?.chaos ?? null,
      unique: one,
      format: c => formatChaos(c, p.divine.value)
    })
    return sections.length ? { ...model, sections: [...model.sections, ...sections] } : model
  } catch {
    return model
  }
}

// A divination card's tooltip ends with how rare it is among all card drops
// (stacked-deck drop weights). The drop data loads on the first card hover;
// without it the tooltip shows as it was.
// A gem's versions with their prices and where to get it (Guy's pick I5,
// gem-tip-extras.ts). Without the data the tooltip shows as it was.
async function withGemExtras (model: TipModel, ref: ItemTipRef): Promise<TipModel> {
  try {
    const [{ gemLadder, gemSource }, sources] = await Promise.all([
      import('./gem-tip-extras'),
      import('../../pob-builds/gem-sources.json').then(m => m.default as unknown as GemTable).catch(() => null)
    ])
    price ??= usePrice()
    const p = price
    const ninja = usePoeninja()
    const ladder = gemLadder(ninja.findPricesByName('GEM', ref.name), ref.variant, c => formatChaos(c, p.divine.value))
    const where = gemSource(ref.name, sources)
    const sections = [...(ladder.length ? [ladder] : []), ...(where ? [[[{ text: where, tone: 'dim' as const }]]] : [])]
    return sections.length ? { ...model, sections: [...model.sections, ...sections] } : model
  } catch {
    return model
  }
}

// Then the set's cost against its reward and the maps it is likeliest in
// (Guy's pick I4, card-tip-extras.ts).
async function withCardRarity (model: TipModel, card: string, market: TipMarket | null): Promise<TipModel> {
  try {
    const [{ cardDropFacts, loadCardDrops, rarityText }, { cardExtraSections }] = await Promise.all([import('../../card-drops/card-drops'), import('./card-tip-extras')])
    const data = await loadCardDrops()
    const facts = cardDropFacts(data, card)
    const rarity = rarityText(facts)
    price ??= usePrice()
    const p = price
    const extras = cardExtraSections(card, pack.items?.[card], data && facts ? { data, facts } : null, {
      // The price after the fake-price checks, as the reward's is.
      card: market && !market.range ? (p.priceOf(card, { ns: 'DIVINATION_CARD' })?.chaos ?? null) : null,
      reward: r => (r.ns === 'UNIQUE' && p.isVariable(r.name)) ? null : p.priceOf(r.name, { ns: r.ns })?.chaos ?? null,
      format: c => formatChaos(c, p.divine.value)
    })
    const sections = [...(rarity ? [[[{ text: `Rarity: ${rarity}, by drop weight`, tone: 'dim' as const }]]] : []), ...extras]
    return sections.length ? { ...model, sections: [...model.sections, ...sections] } : model
  } catch {
    return model
  }
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
  // Its right-click opens the item's menu: the tooltip's key line says so.
  const opts = { menu: menuOwner(el) != null }
  if (own) {
    timer = setTimeout(() => { if (mine === seq && el.isConnected) showTipAt(el, own, opts) }, SHOW_DELAY_MS)
    return
  }
  timer = setTimeout(() => {
    tipFor(ref).then(({ model, market, uniques, effects }) => {
      if (mine !== seq || !el.isConnected) return
      const note = ref.note ? [ref.note.split('\n').map(text => [{ text, tone: 'dim' as const }])] : []
      if (model && note.length) model = { ...model, sections: [...model.sections, ...note] }
      if (model) showTipAt(el, { kind: 'lookup', model, market, uniques, effects }, opts)
      else if (ref.fallback) showTipAt(el, ref.fallback, opts)
      // No text for it, but a price or the caller's note is still worth showing.
      else if (market || note.length) showTipAt(el, { kind: 'lookup', model: { name: ref.name, frame: 'normal', sections: note }, market }, opts)
      else hideTip()
    }).catch(() => {
      if (mine !== seq) return
      if (ref.fallback && el.isConnected) showTipAt(el, ref.fallback, opts)
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
    if (ref) retireHint(ITEM_MENU_HINT)
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
