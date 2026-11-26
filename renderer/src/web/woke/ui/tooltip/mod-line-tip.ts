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
import type { Directive } from 'vue'
import type { LookupTip } from './tooltip'
import { hideTip, showTipAt } from './tooltip'

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

interface State { value: ModLine | null | undefined, timer?: ReturnType<typeof setTimeout>, shown: boolean, enter: (e: MouseEvent) => void, leave: () => void }
const states = new WeakMap<HTMLElement, State>()

export const vModTip: Directive<HTMLElement, ModLine | null | undefined> = {
  mounted (el, binding) {
    const s: State = {
      value: binding.value,
      shown: false,
      enter () {
        clearTimeout(s.timer)
        if (!s.value) return
        s.timer = setTimeout(() => {
          if (!s.value || !el.isConnected || !el.matches(':hover')) return
          s.shown = true
          showTipAt(el, modLineTip(s.value))
        }, DELAY)
      },
      leave () {
        clearTimeout(s.timer)
        if (s.shown) { s.shown = false; hideTip() }
      }
    }
    states.set(el, s)
    el.dataset.modTip = ''
    // The tooltip says it all: no title card on top of it.
    if (!el.hasAttribute('title')) el.setAttribute('title', '')
    el.addEventListener('mouseenter', s.enter)
    el.addEventListener('mouseleave', s.leave)
  },
  updated (el, binding) {
    const s = states.get(el)
    if (s) s.value = binding.value
  },
  beforeUnmount (el) {
    const s = states.get(el)
    if (!s) return
    s.leave()
    el.removeEventListener('mouseenter', s.enter)
    el.removeEventListener('mouseleave', s.leave)
    states.delete(el)
  }
}
