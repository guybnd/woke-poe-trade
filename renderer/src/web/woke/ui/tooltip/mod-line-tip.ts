// A mod row's hover tooltip outside the price check (map mods, Valdo, deaths,
// Harvest swaps): the mod's whole text in the game tooltip's card, with a dim
// line or two under it (its rating, what a click does). The price check's own
// rows have their tier ladder instead (price-insight/mod-tip-hover.ts).
//
//   <span v-mod-tip="{ text: mod.text, notes: ['Deadly for your build'] }">
//
// It waits a moment, as the price check's does, so passing over rows shows
// nothing. The element gets data-mod-tip; a title on it or a parent is
// silenced, since the tooltip says it.
import type { ObjectDirective } from 'vue'
import type { LookupTip, TipContent } from './tooltip'
import { hideTip, showTipAt, tip } from './tooltip'

export interface ModLine {
  // The mod's text; a mod over several lines may pass them joined with "\n".
  text: string | string[]
  // The card's head: "Map mod", "Valdo map mod".
  head?: string
  // Dim lines under the mod, one each.
  notes?: Array<string | null | undefined | false>
}

export function modLineTip (m: ModLine): LookupTip {
  const lines = (Array.isArray(m.text) ? m.text : [m.text]).flatMap(t => t.split('\n')).map(t => t.trim()).filter(Boolean)
  const notes = (m.notes ?? []).filter((n): n is string => typeof n === 'string' && n.trim() !== '')
  return {
    kind: 'lookup',
    model: {
      name: m.head ?? 'Mod',
      frame: 'normal',
      sections: [
        lines.map(text => [{ text, tone: 'mod' as const }]),
        ...(notes.length ? [notes.map(text => [{ text, tone: 'dim' as const }])] : [])
      ]
    },
    market: null
  }
}

const DELAY = 250

// One pair of listeners for the whole page, as item-tip.ts does, not two per
// row: long lists (the regex builder's) would go over the perf listener budget.
const values = new WeakMap<HTMLElement, ModLine | null | undefined>()
let hovered: HTMLElement | null = null
let timer: ReturnType<typeof setTimeout> | undefined
// What this module put up, so a leave never hides another row's tooltip.
let shown: { el: HTMLElement, content: TipContent } | null = null

function show (el: HTMLElement) {
  const v = values.get(el)
  if (!v) return
  const content = modLineTip(v)
  shown = { el, content }
  showTipAt(el, content)
  watchHovered()
}

function enter (el: HTMLElement) {
  hovered = el
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (hovered === el && el.isConnected && el.matches(':hover')) show(el)
  }, DELAY)
}

function leave () {
  clearTimeout(timer)
  clearInterval(watch)
  hovered = null
  if (shown && tip.value?.content === shown.content) hideTip()
  shown = null
}

// A row hidden without being removed (v-show, a panel closed) never sends
// mouseout: while a tooltip is up, check its row is still shown and hovered.
let watch: ReturnType<typeof setInterval> | undefined
function watchHovered () {
  clearInterval(watch)
  watch = setInterval(() => {
    const el = hovered
    if (!el || !shown) { clearInterval(watch); return }
    if (!el.isConnected || el.offsetParent === null || !el.matches(':hover')) leave()
  }, 400)
}

function tipEl (node: EventTarget | null): HTMLElement | null {
  let el = node instanceof Element ? node : node instanceof Node ? node.parentElement : null
  for (; el; el = el.parentElement) {
    if (values.has(el as HTMLElement)) return el as HTMLElement
  }
  return null
}

let watching = false
function watchHover () {
  if (watching) return
  watching = true
  document.addEventListener('mouseover', (e) => {
    const el = tipEl(e.target)
    if (el === hovered) return
    if (hovered) leave()
    if (el) enter(el)
  })
  // Out of the window: no mouseover follows.
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget && hovered) leave()
  })
}

export const vModTip: ObjectDirective<HTMLElement, ModLine | null | undefined> = {
  mounted (el, binding) {
    watchHover()
    values.set(el, binding.value)
    el.dataset.modTip = ''
    // The tooltip says it all: no title card on top of it.
    if (!el.hasAttribute('title')) el.setAttribute('title', '')
  },
  updated (el, binding) {
    values.set(el, binding.value)
    // A click changed the rating under the pointer: show the new notes.
    if (shown?.el === el && tip.value?.content === shown.content && JSON.stringify(binding.value) !== JSON.stringify(binding.oldValue)) {
      if (binding.value) show(el)
      else leave()
    }
  },
  beforeUnmount (el) {
    if (hovered === el) leave()
    values.delete(el)
  }
}
