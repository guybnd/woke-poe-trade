// The layout audit: while a fake-game test runs, the page watches itself for
// layout faults: text cut off by its box, a box spilling out of its window or
// off screen, sideways scrollbars, buttons in one row that don't line up or
// wrap onto a second line, text under 11px, overlapping text and a lone word
// left on the last line of a paragraph.
//
// It only runs when WOKE_LAYOUT_AUDIT names a folder: every fault seen is
// appended to <folder>/issues.jsonl with the test's name, and the first time a
// fault is seen its window is saved to <folder>/shots/ with the fault boxed in
// red. `node tools/layout-report.mjs <folder>` groups them.
//
// An element (or a parent) with `data-layout-ok="<why>"` is skipped: a
// deliberate sideways scroller, decoration that's meant to bleed.

export type LayoutRule =
  | 'clipped' // text runs past the edge of a box that hides overflow
  | 'cut-no-title' // text ends in "…" and nothing shows the rest on hover
  | 'spill' // a control or text sticks out of its window
  | 'offscreen' // part of a window is outside the screen
  | 'scroll-x' // a sideways scrollbar inside a window
  | 'row-misalign' // controls side by side whose middles don't line up
  | 'row-heights' // controls side by side with different heights
  | 'row-wrap' // a row of controls wrapped onto a second line
  | 'tiny-text' // text under 11px (charter P19)
  | 'overlap' // two texts drawn over each other
  | 'widow' // a paragraph's last line is one short word

export interface LayoutIssue {
  rule: LayoutRule
  // #widget-N it was in; the harness maps it to the widget type.
  widget: string | null
  where: string
  text: string
  detail: string
  rect: { x: number, y: number, w: number, h: number }
  // The window around it, for the screenshot.
  frame: { x: number, y: number, w: number, h: number } | null
}

// Runs in the page (page.addInitScript). Calls window.__wokeLayoutIssue for
// each new fault; the harness saves it.
export function installLayoutAudit () {
  type W = { __wokeLayoutIssue?: (i: LayoutIssue) => Promise<void>, __wokeLayoutScan?: () => void }
  const w = window as unknown as W
  const seen = new Set<string>()
  let busy = false

  const CONTROL = 'button, a[href], [role="button"], input:not([type="hidden"]), select, .w-btn, .w-chip, .w-seg'

  const describe = (el: Element) => {
    const parts: string[] = []
    for (let e: Element | null = el, i = 0; e && e !== document.body && i < 5; e = e.parentElement, i++) {
      // CSS module classes (_tierRow_1okt4_82) by their name in the template ($tierRow).
      const cls = [...e.classList].map(c => c.replace(/^_(.+?)_[a-z0-9]{5}(_\d+)?$/, '$$$1')).filter(c => !c.startsWith('w-enter')).slice(0, 3).join('.')
      parts.unshift(e.tagName.toLowerCase() + (e.id ? `#${e.id}` : '') + (cls ? `.${cls}` : ''))
    }
    return parts.join(' > ')
  }

  const box = (r: DOMRect) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) })

  const visible = (el: Element) => {
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return false
    return !('checkVisibility' in el) || (el as HTMLElement).checkVisibility({ opacityProperty: true, visibilityProperty: true })
  }

  const frameOf = (el: Element): Element | null =>
    el.closest('[data-w-panel], [role="tooltip"], [role="menu"], [role="dialog"], [id^="widget-"]')

  const skip = (el: Element) => {
    if (el.closest('[data-layout-audit], script, style, svg, option, select, textarea')) return true
    const ok = el.closest('[data-layout-ok]')
    return !!ok && !!ok.getAttribute('data-layout-ok')?.trim()
  }

  const ownText = (el: Element) => {
    let t = ''
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue
    return t.replace(/\s+/g, ' ').trim()
  }
  const textOf = (el: Element) => ((el as HTMLElement).innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80)

  const report = (rule: LayoutRule, el: Element, detail: string) => {
    const where = describe(el)
    const text = textOf(el)
    const key = `${rule}|${where}|${text}`
    if (seen.has(key)) return
    seen.add(key)
    const frame = frameOf(el)
    const issue: LayoutIssue = {
      rule,
      widget: el.closest('[id^="widget-"]')?.id ?? null,
      where,
      text,
      detail,
      rect: box(el.getBoundingClientRect()),
      frame: frame ? box(frame.getBoundingClientRect()) : null
    }
    queue.push(issue)
  }

  const queue: LayoutIssue[] = []
  let sending = false
  const flush = async () => {
    if (sending || !w.__wokeLayoutIssue) return
    sending = true
    try {
      while (queue.length) {
        const issue = queue.shift()!
        // Box the fault in red for the screenshot, then take it away.
        const mark = document.createElement('div')
        mark.setAttribute('data-layout-audit', '')
        Object.assign(mark.style, {
          position: 'fixed', left: `${issue.rect.x - 2}px`, top: `${issue.rect.y - 2}px`, width: `${issue.rect.w + 4}px`, height: `${issue.rect.h + 4}px`,
          outline: '2px solid #ff2a2a', zIndex: '2147483647', pointerEvents: 'none'
        })
        busy = true
        document.body.appendChild(mark)
        try { await w.__wokeLayoutIssue(issue) } catch {}
        mark.remove()
        busy = false
      }
    } finally { sending = false }
  }

  const lines = (el: Element) => {
    // Line boxes of the element's own text, grouped by their top.
    const range = document.createRange()
    range.selectNodeContents(el)
    const rows = new Map<number, { left: number, right: number }>()
    for (const r of range.getClientRects()) {
      if (r.width < 1) continue
      const k = Math.round(r.top / 4)
      const row = rows.get(k)
      if (row) { row.left = Math.min(row.left, r.left); row.right = Math.max(row.right, r.right) } else rows.set(k, { left: r.left, right: r.right })
    }
    return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1])
  }

  const scan = () => {
    if (!document.body || busy) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const all = document.body.querySelectorAll('*')
    for (const el of all) {
      if (skip(el) || !visible(el)) continue
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      const own = ownText(el)

      // Text under 11px.
      if (own.length > 1 && parseFloat(cs.fontSize) < 10.95) report('tiny-text', el, `${cs.fontSize}`)

      // Boxes that hide or scroll overflow.
      const ox = cs.overflowX
      if ((ox === 'hidden' || ox === 'clip') && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
        if (cs.textOverflow === 'ellipsis') {
          if (!el.closest('[title]') && !el.closest('[data-item-tip]')) report('cut-no-title', el, `${el.scrollWidth}px of text in ${el.clientWidth}px`)
        } else if (textOf(el)) {
          // Only when text is what's cut, not decoration.
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
          let cut = ''
          for (let n = walker.nextNode(), i = 0; n && i < 300; n = walker.nextNode(), i++) {
            if (!n.nodeValue?.trim() || !n.parentElement || !visible(n.parentElement)) continue
            const range = document.createRange()
            range.selectNodeContents(n)
            const t = range.getBoundingClientRect()
            if (t.width > 0 && (t.right > r.right + 2 || t.left < r.left - 2)) { cut = n.nodeValue.trim().slice(0, 40); break }
          }
          if (cut) report('clipped', el, `"${cut}" runs past the edge (${el.scrollWidth}px in ${el.clientWidth}px)`)
        }
      }
      if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 40) {
        report('scroll-x', el, `${el.scrollWidth}px wide in ${el.clientWidth}px`)
      }

      // Out of its window, or off screen.
      const isLeafish = !!own || el.matches(CONTROL) || el.tagName === 'IMG'
      if (isLeafish) {
        const frame = frameOf(el)
        if (frame && frame !== el) {
          const f = frame.getBoundingClientRect()
          // A scroller between the element and its window hides the spill.
          let hidden = false
          for (let p = el.parentElement; p && p !== frame; p = p.parentElement) {
            const o = getComputedStyle(p).overflowX
            if (o !== 'visible') { hidden = true; break }
          }
          if (!hidden && (r.right > f.right + 2 || r.left < f.left - 2)) report('spill', el, `${Math.round(Math.max(r.right - f.right, f.left - r.left))}px outside its window`)
        }
      }
      if ((el.matches('[data-w-panel]') || el.matches('[role="menu"], [role="tooltip"]')) && (r.right > vw + 1 || r.bottom > vh + 1 || r.left < -1 || r.top < -1)) {
        report('offscreen', el, `window at ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} on a ${vw}x${vh} screen`)
      }

      // Rows of controls.
      if ((cs.display === 'flex' || cs.display === 'inline-flex') && !cs.flexDirection.startsWith('column')) {
        const kids = [...el.children].filter(k => visible(k) && getComputedStyle(k).position !== 'absolute' && getComputedStyle(k).position !== 'fixed')
        const controls = kids.filter(k => k.matches(CONTROL) && (k.textContent ?? '').trim().length > 1)
        if (controls.length >= 2) {
          const rects = controls.map(k => k.getBoundingClientRect())
          const tops = new Set(rects.map(b => Math.round(b.top / (Math.min(...rects.map(x => x.height)) * 0.6))))
          if (cs.flexWrap !== 'nowrap' && tops.size > 1) {
            report('row-wrap', el, `${controls.length} controls on ${tops.size} lines`)
          } else {
            const mids = rects.map(b => b.top + b.height / 2)
            const spread = Math.max(...mids) - Math.min(...mids)
            if (spread > 2.5) report('row-misalign', el, `middles ${Math.round(spread)}px apart`)
            // Only controls drawn as a box: a quiet (ghost) button is text, its height doesn't show.
            const boxed = controls.map((k, i) => [k, rects[i]] as const).filter(([k]) => {
              const s = getComputedStyle(k)
              return s.borderImageSource !== 'none' || s.backgroundImage !== 'none' || !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor) || parseFloat(s.borderTopWidth) > 0 && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.borderTopColor)
            })
            const hs = boxed.map(([, b]) => b.height)
            const hd = Math.max(...hs) - Math.min(...hs)
            if (hs.length >= 2 && hd > 5) report('row-heights', el, `heights ${hs.map(Math.round).join('/')}px`)
          }
        }
      }

      // Overlapping texts among in-flow siblings.
      // Inline boxes of wrapped text share lines, so only block-like boxes count.
      if (own && el.nextElementSibling && !cs.display.startsWith('inline')) {
        const pos = cs.position
        if (pos === 'static' || pos === 'relative') {
          for (let s = el.nextElementSibling, i = 0; s && i < 4; s = s.nextElementSibling, i++) {
            if (!ownText(s) || !visible(s)) continue
            const ss = getComputedStyle(s)
            if ((ss.position !== 'static' && ss.position !== 'relative') || ss.display.startsWith('inline')) continue
            const b = s.getBoundingClientRect()
            const ix = Math.min(r.right, b.right) - Math.max(r.left, b.left)
            const iy = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top)
            if (ix > 3 && iy > 3) { report('overlap', el, `overlaps "${ownText(s).slice(0, 30)}"`); break }
          }
        }
      }

      // A paragraph that leaves one short word on its last line.
      if (own.length > 30 && own.includes(' ') && el.children.length === 0 && cs.display !== 'inline' && cs.whiteSpace !== 'nowrap') {
        const ls = lines(el)
        if (ls.length >= 2) {
          const widest = Math.max(...ls.map(l => l.right - l.left))
          const last = ls[ls.length - 1]
          const lastW = last.right - last.left
          if (lastW < widest * 0.22) report('widow', el, `last line ${Math.round(lastW)}px of ${Math.round(widest)}px`)
        }
      }
    }
    flush()
  }

  let quiet: ReturnType<typeof setTimeout> | undefined
  let last = 0
  const later = () => {
    if (busy) return
    clearTimeout(quiet)
    if (Date.now() - last > 1500) { last = Date.now(); quiet = setTimeout(scan, 0); return }
    quiet = setTimeout(() => { last = Date.now(); scan() }, 300)
  }
  w.__wokeLayoutScan = scan
  const start = () => {
    new MutationObserver(later).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] })
    window.addEventListener('resize', later)
    later()
  }
  if (document.documentElement) start()
  else document.addEventListener('DOMContentLoaded', start)
}
