// Every new item opens collapsed, and a trivial bargain doesn't take a row.
import { afterEach, describe, expect, it, vi } from 'vitest'
// Loaded before window is stubbed, or Vue takes this for a browser.
import 'vue'
import { buildInsight } from '@/web/woke/price-insight/insight'
import type { InsightListing } from '@/web/woke/price-insight/insight'

const NOW = Date.parse('2026-11-05T12:00:00Z')

function row (id: string, chaos: number): InsightListing {
  return {
    id,
    priceAmount: chaos,
    priceCurrency: 'chaos',
    indexedAt: new Date(NOW - 30 * 3600e3).toISOString(),
    hasNote: true,
    hasFee: true,
    isMine: false,
    accountName: 's-' + id,
    accountStatus: 'online',
    listedTimes: 1
  }
}
const market = (chaos: number) => Array.from({ length: 8 }, (_, i) => row(`r${i}`, chaos))
const snipe = (rows: InsightListing[]) =>
  buildInsight(rows, { divine: 180, now: NOW }).signals.find(s => s.kind === 'snipe')?.text

describe('bargain warning', () => {
  it('stays quiet when the saving is a fraction of a chaos', () => {
    expect(snipe([row('x', 0.3), ...market(1)])).toBeUndefined()
  })

  it('shows a sub-chaos price instead of rounding it to 0c', () => {
    expect(snipe([row('x', 0.3), ...market(20)])).toContain('0.3c')
  })

  it('still points out a real bargain', () => {
    expect(snipe([row('x', 20), ...market(100)])).toContain('20c')
  })

  it('never rounds a tiny price to 0c', () => {
    expect(snipe([row('x', 0.04), ...market(20)])).toContain('under 0.1c')
  })

  it('points out a bargain under old offline instant buyouts, which still set the fair price', () => {
    // Offline, week-old instant buyouts can still be bought, so they count in full.
    const old = { indexedAt: new Date(NOW - 10 * 86400e3).toISOString(), accountStatus: 'offline' as const }
    const rows = [row('x', 5), ...['a', 'b', 'c'].map(id => ({ ...row(id, 100), ...old }))]
    const insight = buildInsight(rows, { divine: 180, now: NOW })
    expect(insight.range?.fair).toBe(100)
    expect(insight.signals.find(s => s.kind === 'snipe')?.text).toContain('5c')
  })
})

describe('collapseForNewItem', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  async function load () {
    vi.resetModules()
    vi.stubGlobal('window', { addEventListener () {} })
    vi.stubGlobal('localStorage', { getItem: () => '1', setItem () {} })
    return await import('@/web/woke/price-insight/view')
  }

  it('starts collapsed even if an older build remembered it open', async () => {
    const view = await load()
    expect(view.verdictExpanded.value).toBe(false)
    expect(view.historyOpen.value).toBe(false)
  })

  it('closes both for a new item', async () => {
    const view = await load()
    view.collapseForNewItem({ id: 1 })
    view.verdictExpanded.value = true
    view.historyOpen.value = true
    view.collapseForNewItem({ id: 2 })
    expect(view.verdictExpanded.value).toBe(false)
    expect(view.historyOpen.value).toBe(false)
  })

  it('leaves them alone for the same item', async () => {
    const view = await load()
    const item = { id: 1 }
    view.collapseForNewItem(item)
    view.verdictExpanded.value = true
    view.historyOpen.value = true
    view.collapseForNewItem(item)
    expect(view.verdictExpanded.value).toBe(true)
    expect(view.historyOpen.value).toBe(true)
  })
})
