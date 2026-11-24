import { describe, expect, it } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { requestGoto, useGoto } from '@/web/woke/tab-bar/goto'
import type { Widget } from '@/web/overlay/widgets'

const widget = (wmId: number) => ({ wmId, wmType: 'woke-net-worth', wmTitle: '', wmWants: 'hide', wmZorder: null, wmFlags: [] }) as unknown as Widget

describe("What's new Show me: a window opens on the tab asked for", () => {
  it('asked before the window mounts (a new window) or while it is up, once each', async () => {
    const went: string[] = []
    const go = { holdings: () => went.push('holdings'), sales: () => went.push('sales'), listed: () => went.push('listed'), runs: () => went.push('runs'), spots: { 'per-hour': () => went.push('spot:per-hour'), 'faustus-box': () => went.push('spot:faustus-box'), 'still-cheapest': () => went.push('spot:still-cheapest'), 'stale': () => went.push('spot:stale') } }
    requestGoto(41, 'listed')
    const scope = effectScope()
    scope.run(() => { useGoto(widget(41), 'woke-net-worth', go) })
    expect(went).toEqual(['listed'])
    requestGoto(41, 'runs')
    await nextTick()
    expect(went).toEqual(['listed', 'runs'])
    // Another window's request isn't this one's.
    requestGoto(42, 'sales')
    await nextTick()
    expect(went).toEqual(['listed', 'runs'])
    // A spot: the tab first, then whatever reveals the feature on it.
    requestGoto(41, 'listed', 'stale')
    await nextTick()
    expect(went).toEqual(['listed', 'runs', 'listed', 'spot:stale'])
    scope.stop()
  })
})
