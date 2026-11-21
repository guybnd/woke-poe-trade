// The item hover gate: every item a screen names shows the game's item tooltip
// on hover. Guy's rule for the whole app, checked on every fake-game test.
//
// While a test runs, the page watches itself: whenever it settles, each visible
// text that is exactly an item's name (a unique, base, gem, currency or card)
// must sit inside an element with the item tooltip. `v-item-tip` (and so
// `WItemRow`) marks its element with `data-item-tip`; code that calls
// showTip/showTipAt with an item itself puts the attribute on the hovered
// element.
//
// A name that rightly has no item tooltip (the price check's own heading, a
// name inside an input) is allowed with `data-no-item-tip="why"` on it or a
// parent. The reason is required: an empty one doesn't count. Text inside a
// tooltip or a menu, and text the mouse can't reach (pointer-events: none),
// is never checked.
//
// The harness fails the test with every gap it saw (harness.ts).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const ITEMS = path.resolve(here, '../../renderer/public/data/en/items.ndjson')

export interface TipGap {
  name: string
  // The widget it was in (#widget-N), when it was in one.
  widget: string | null
  // A few ancestors, innermost last, to find it in the template.
  where: string
}

let names: string[] | null = null

// One-word uniques that are also plain words a label could be.
const PLAIN_WORDS = new Set(['Ambition', 'Allure', 'Beauty', 'Cooperation', 'Curiosity', 'Fragility', 'Gluttony', 'Inertia', 'Pacifism', 'Perseverance', 'Pragmatism', 'Repentance', 'Skirmish', 'Voices', 'Obliteration', 'Singularity', 'Wanderlust', 'Southbound', 'Perfidy', 'Pyre', 'Rive', 'Praxis', 'Cortex', 'Powerlessness'])

// Names that read as items. One-word gems, cards and bases ("Portal",
// "Home", "Map", "Ring") are also plain words the UI uses, so only uniques
// count with one word.
export function itemNames (): string[] {
  if (names) return names
  const out = new Set<string>()
  for (const line of fs.readFileSync(ITEMS, 'utf8').split('\n')) {
    if (!line.trim()) continue
    const it = JSON.parse(line) as { refName: string, namespace: string }
    if (!['ITEM', 'UNIQUE', 'GEM', 'DIVINATION_CARD'].includes(it.namespace)) continue
    if (!it.refName.includes(' ') && (it.namespace !== 'UNIQUE' || PLAIN_WORDS.has(it.refName))) continue
    out.add(it.refName)
  }
  names = [...out]
  return names
}

// Runs in the page (page.addInitScript): watches the DOM and collects gaps
// on window.__wokeTipGaps.
export function installTipAudit (list: string[]) {
  const w = window as unknown as { __wokeTipGaps?: TipGap[], __wokeTipAudit?: () => void }
  const known = new Set(list)
  const seen = new Set<string>()
  const gaps: TipGap[] = []
  w.__wokeTipGaps = gaps

  const describe = (el: Element) => {
    const parts: string[] = []
    for (let e: Element | null = el, i = 0; e && e !== document.body && i < 5; e = e.parentElement, i++) {
      // CSS module classes (_tierRow_a1b2c) by their name in the template ($tierRow).
      const cls = [...e.classList].map(c => c.replace(/^_(.+)_[\w-]{5}$/, '$$$1')).slice(0, 3).join('.')
      parts.unshift(e.tagName.toLowerCase() + (e.id ? `#${e.id}` : '') + (cls ? `.${cls}` : ''))
    }
    return parts.join(' > ')
  }

  const exempt = (el: Element) => {
    if (el.closest('[role="tooltip"], [role="menu"], option, select, textarea, script, style')) return true
    const off = el.closest('[data-no-item-tip]')
    return !!off && !!off.getAttribute('data-no-item-tip')?.trim()
  }

  const visible = (el: Element) => {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return false
    // The mouse can't reach it (a glance bar, a popup that never takes the mouse).
    if (getComputedStyle(el).pointerEvents === 'none') return false
    return !('checkVisibility' in el) || (el as HTMLElement).checkVisibility({ opacityProperty: true, visibilityProperty: true })
  }

  const scan = () => {
    if (!document.body) return
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.nodeValue?.trim()
      if (!text || text.length < 4 || !known.has(text)) continue
      const el = n.parentElement
      if (!el || el.closest('[data-item-tip]') || exempt(el) || !visible(el)) continue
      const widget = el.closest('[id^="widget-"]')?.id ?? null
      const where = describe(el)
      const key = `${text}|${where}`
      if (seen.has(key)) continue
      seen.add(key)
      gaps.push({ name: text, widget, where })
    }
  }

  // Each time the page settles: 150 ms after the last change, at least once a
  // second while it keeps changing (a ticking timer).
  let quiet: ReturnType<typeof setTimeout> | undefined
  let last = 0
  const later = () => {
    clearTimeout(quiet)
    if (Date.now() - last > 1000) { last = Date.now(); scan(); return }
    quiet = setTimeout(() => { last = Date.now(); scan() }, 150)
  }
  w.__wokeTipAudit = scan
  const start = () => {
    new MutationObserver(later).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] })
    later()
  }
  if (document.documentElement) start()
  else document.addEventListener('DOMContentLoaded', start)
}
