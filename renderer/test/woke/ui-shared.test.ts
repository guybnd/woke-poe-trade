// The shared pieces Guy picked so screens can't drift (one per concept):
// each renders its one look, and no screen goes back to a hand-rolled copy.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { createSSRApp, h } from 'vue'
import type { Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import WRateChip from '@/web/woke/ui/WRateChip.vue'
import WPrice from '@/web/woke/ui/WPrice.vue'
import WThin from '@/web/woke/ui/WThin.vue'
import WSortButton from '@/web/woke/ui/WSortButton.vue'
import WSortHead from '@/web/woke/ui/WSortHead.vue'
import WRowActs from '@/web/woke/ui/WRowActs.vue'
import WBackLink from '@/web/woke/ui/WBackLink.vue'
import WSearchField from '@/web/woke/ui/WSearchField.vue'
import WNoMatch from '@/web/woke/ui/WNoMatch.vue'
import { NO_PRICE, THIN_MARKET } from '@/web/woke/ui/format'
import { RATE_HEAD, RATE_WORD, nextModRating } from '@/web/woke/map-mods/rules'

async function render (c: Component, props: Record<string, unknown> = {}, slots?: Record<string, () => unknown>) {
  const app = createSSRApp({ render: () => h(c, props, slots as never) })
  return (await renderToString(app)).replace(/<!--[\s\S]*?-->/g, '')
}

const WOKE = path.resolve(__dirname, '../../src/web/woke')
function vueFiles (dir = WOKE): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) return name === 'league-invest' ? [] : vueFiles(p)
    return name.endsWith('.vue') ? [p] : []
  })
}
const rel = (p: string) => path.relative(WOKE, p).replace(/\\/g, '/')
function offenders (re: RegExp, except: string[] = []) {
  return vueFiles().filter(p => !except.includes(rel(p)) && re.test(readFileSync(p, 'utf8'))).map(rel)
}

describe('rating words (WRateChip)', () => {
  it('says Bad / Care / Want, and a dash when not rated', async () => {
    expect(RATE_WORD).toEqual({ deadly: 'Bad', warn: 'Care', good: 'Want', ok: '–' })
    expect(RATE_HEAD.ok).toBe('Not rated')
    for (const r of ['deadly', 'warn', 'good', 'ok'] as const) {
      const html = await render(WRateChip, { rating: r })
      expect(html).toContain(`>${RATE_WORD[r]}</button>`)
      expect(html).toContain(`data-map-rate="${r}"`)
    }
  })

  it('is a plain label when it can\'t be changed', async () => {
    const html = await render(WRateChip, { rating: 'warn', clickable: false })
    expect(html).toMatch(/<span class="w-rate w-rate--warn"/)
    expect(html).not.toContain('<button')
  })

  it('steps through Bad, Care, Want and back to none', () => {
    expect(['ok', 'deadly', 'warn', 'good'].map(r => nextModRating(r as never))).toEqual(['deadly', 'warn', 'good', 'ok'])
  })

  it('is the only rating look: no screen keeps its own words', () => {
    expect(offenders(/'Avoid'|'Careful'|RATE_BUTTONS|RATING_LABEL|"can't run", warn/)).toEqual([])
  })
})

describe('no price (WPrice null)', () => {
  it('is a dim dash with the reason on hover', async () => {
    const html = await render(WPrice, { chaos: null })
    expect(html).toContain('—')
    expect(html).toContain(`title="${NO_PRICE}"`)
    expect(await render(WPrice, { chaos: null, none: 'No saved prices yet' })).toContain('title="No saved prices yet"')
  })

  it('is never written by hand', () => {
    expect(offenders(/>\s*no price\s*</i)).toEqual([])
    expect(offenders(/: 'no price'|'No poe\.ninja price'/)).toEqual([])
  })
})

describe('thin market (WThin)', () => {
  it('is a "!" after the price with the reason on hover', async () => {
    const html = await render(WPrice, { chaos: 5, thin: true })
    expect(html).toMatch(/chaos\.png[^>]*>.*data-thin[^>]*>!<\/span>/s)
    expect(html).toContain(`title="${THIN_MARKET}"`)
    expect(await render(WThin, { title: 'Only 2 days' })).toContain('title="Only 2 days"')
    // No price: no marker either.
    expect(await render(WPrice, { chaos: null, thin: true })).not.toContain('data-thin')
  })

  it('has one look: no faint icon before the name, no ", thin market" words', () => {
    expect(offenders(/fa-exclamation-circle w-faint/)).toEqual([])
    expect(offenders(/', thin market'|', few listings'|low confidence<\/span>/)).toEqual([])
  })
})

describe('sort (WSortButton, WSortHead)', () => {
  const options = [{ value: 'manual', label: 'My order' }, { value: 'name', label: 'Name' }]
  it('names the list\'s order on the icon and lights it off My order', async () => {
    expect(await render(WSortButton, { modelValue: 'manual', options })).toContain('title="Sort: My order"')
    expect(await render(WSortButton, { modelValue: 'manual', options })).not.toContain('w-icon-btn--on')
    expect(await render(WSortButton, { modelValue: 'name', options })).toContain('w-icon-btn--on')
  })

  it('heads a column with its state and one arrow', async () => {
    expect(await render(WSortHead, { label: 'Price', active: false })).toContain('aria-label="Sort by Price"')
    const on = await render(WSortHead, { label: 'Price', active: true, desc: false })
    expect(on).toContain('aria-label="Price, sorted ascending"')
    expect(on.match(/fa-caret-up/g)).toHaveLength(1)
  })

  it('is the only sort look in saved lists and tables', () => {
    expect(offenders(/fa-sort-amount-down/, ['ui/WSortButton.vue'])).toEqual([])
    expect(offenders(/\$style\.sortBtn|\$style\.sortHead|' ▾' : ' ▴'/)).toEqual([])
  })
})

describe('saved list rows (WRowActs) and menu words', () => {
  it('keeps the main action on and the rest on hover', async () => {
    const html = await render(WRowActs, {}, { default: () => h('button', 'Copy'), hover: () => h('button', 'Edit') })
    expect(html).toMatch(/<span class="w-line-acts w-row-acts-hover"><button>Edit<\/button><\/span><button>Copy<\/button>/)
  })

  it('says Remove with one icon set', () => {
    expect(offenders(/label: 'Delete'|>Delete<\/WButton>|title="Delete/, ['campaign/run-timer-editor.vue'])).toEqual([])
    expect(offenders(/label: 'Rename', icon: 'fas fa-i-cursor', keys: 'F2', action: \(\) => (tree\.)?startEdit\((b|'item'|'strategy')/)).toEqual([])
    expect(offenders(/label: 'Duplicate', icon: 'fas fa-clone'/)).toEqual([])
  })
})

describe('back (WBackLink)', () => {
  it('names where it goes', async () => {
    const html = await render(WBackLink, { to: 'Runs' })
    expect(html).toContain('fa-chevron-left')
    expect(html).toContain('>Runs</span>')
  })

  it('is the only back control in drill-downs', () => {
    expect(offenders(/title="Back" @click="openId = null"|icon="fas fa-arrow-left"[^>]*>Back</)).toEqual([])
  })
})

describe('search and no match (WSearchField, WNoMatch)', () => {
  it('filters with the magnifier and says what', async () => {
    const html = await render(WSearchField, { modelValue: '', things: 'bookmarks' })
    expect(html).toContain('fa-search')
    expect(html).toContain('placeholder="Filter bookmarks"')
  })

  it('says nothing matches, with a way out', async () => {
    const html = await render(WNoMatch, { query: ' fossil ' })
    expect(html).toContain('Nothing matches &quot;fossil&quot;')
    expect(html).toContain('Clear search')
  })

  it('has one look: no funnel in filter boxes, no hand-made no-match lines', () => {
    expect(offenders(/<WField[^>]*icon="fas fa-filter"/)).toEqual([])
    // Finders' dropdowns (an item picker, the launcher) say it in one dim line under the box.
    const finders = ['ui/WNoMatch.vue', 'loot-filter/AddItemField.vue', 'loot-filter/ItemSearchField.vue', 'tab-bar/TabBar.vue', 'valdo/ValdoStrip.vue']
    expect(offenders(/Nothing matches "\{\{|No \w+ matches? "\{\{|>No mods match\.<|>Nothing matches\.</, finders)).toEqual([])
  })
})
