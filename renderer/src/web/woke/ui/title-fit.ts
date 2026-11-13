// The game art's title crest sits centred on the whole title bar (poe-frame.css).
// A bar with buttons can leave too little room for it, so each panel measures its
// own bar: what its buttons cover at either end sets how far the crest must keep
// clear, and a crest that can't fit there gives way to a plain title at the left,
// shortened with "…" (data-title-tight on the bar).

// The frame's corner art at each end, which the crest must also keep clear of.
const CORNER = { left: 52, right: 62 }
const GAP = 8
const HYSTERESIS = 16
const crestWidth = new WeakMap<HTMLElement, { text: string, width: number }>()

export function fitTitle (bar: HTMLElement) {
  const art = document.documentElement.dataset.wokeArt != null
  const title = bar.querySelector<HTMLElement>(':scope > .w-trunc')
  if (!art || !title) {
    delete bar.dataset.titleTight
    bar.style.removeProperty('--w-title-clear')
    return
  }
  const box = bar.getBoundingClientRect()
  // A hidden panel has no size; its observer measures again once it shows.
  if (!box.width) return
  // By the buttons' widths, not where they sit: in the tight layout the title
  // pushes them to the ends, in the crest layout they don't, so measuring their
  // positions flipped the layout back and forth on every resize (Guy's bug).
  const style = getComputedStyle(bar)
  const gap = parseFloat(style.columnGap) || 0
  let left = parseFloat(style.paddingLeft) || 0
  let right = parseFloat(style.paddingRight) || 0
  let beforeTitle = true
  for (const el of bar.children) {
    if (el === title) { beforeTitle = false; continue }
    const w = (el as HTMLElement).getBoundingClientRect().width
    if (!w || getComputedStyle(el).position === 'absolute') continue
    if (beforeTitle) left += w + gap
    else right += w + gap
  }
  left = Math.max(left, CORNER.left)
  right = Math.max(right, CORNER.right)
  const clear = Math.ceil(Math.max(left, right) + GAP)
  const cap = parseFloat(style.getPropertyValue('--w-crest-cap')) || 0
  // Half the crest: half the title and its padding, then one end of the banner.
  // Measured as the crest draws it; while tight the plain title may use another
  // size, so the last crest width for this text stands in.
  const text = title.textContent ?? ''
  const wasTight = bar.dataset.titleTight != null
  if (!wasTight || crestWidth.get(bar)?.text !== text) crestWidth.set(bar, { text, width: title.scrollWidth })
  const half = (crestWidth.get(bar)!.width + 12) / 2 + cap
  // A little slack before the crest comes back, so a bar right at the edge doesn't flicker.
  const slack = wasTight ? HYSTERESIS : 0
  const tight = half > box.width / 2 - clear - slack
  // Only on a change, so observers watching the bar don't hear needless writes.
  if (tight !== wasTight) {
    if (tight) bar.dataset.titleTight = ''
    else delete bar.dataset.titleTight
  }
  bar.style.setProperty('--w-title-clear', `${clear}px`)
}

// ---- Watching: every panel's bar on one ResizeObserver and one look watcher ----

const bars = new Set<HTMLElement>()
let sizes: ResizeObserver | undefined
let look: MutationObserver | undefined

function barOf (el: Element): HTMLElement | null {
  return bars.has(el as HTMLElement) ? el as HTMLElement : el.parentElement && bars.has(el.parentElement) ? el.parentElement : null
}

/** Fits the bar now and again whenever it or its buttons change size, or the look changes. */
export function watchTitle (bar: HTMLElement) {
  sizes ??= new ResizeObserver(entries => {
    const touched = new Set<HTMLElement>()
    for (const e of entries) { const b = barOf(e.target); if (b) touched.add(b) }
    touched.forEach(fitTitle)
  })
  // A look switch (theme.ts sets these on the root). Watched on the page, not by
  // importing theme.ts, which touches the document when it loads (and so breaks
  // rendering a panel outside a browser, as the tests do).
  look ??= new MutationObserver(() => requestAnimationFrame(() => bars.forEach(fitTitle)))
  if (bars.size === 0) look.observe(document.documentElement, { attributes: true, attributeFilter: ['data-woke-art', 'data-woke-theme'] })
  bars.add(bar)
  sizes.observe(bar)
  // The buttons can change width without the bar changing size.
  for (const el of bar.children) sizes.observe(el)
}

export function unwatchTitle (bar: HTMLElement) {
  if (!bars.delete(bar)) return
  sizes?.unobserve(bar)
  for (const el of bar.children) sizes?.unobserve(el)
  if (bars.size === 0) look?.disconnect()
}
