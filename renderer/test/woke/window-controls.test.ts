// Panel window buttons and minimize: where the widget sits while collapsed,
// which panel carries the buttons, and what a minimized panel renders.
import { createSSRApp, h } from 'vue'
import { createI18n } from 'vue-i18n'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import { minimizeAnchor, restoreAnchor } from '@/web/woke/ui/window-anchor'
import WPanel from '@/web/woke/ui/WPanel.vue'
import Widget from '@/web/overlay/Widget.vue'

const W = 1920
const H = 1080

describe('minimizeAnchor / restoreAnchor', () => {
  const start = { pos: 'cc', x: 50, y: 50 }
  const rect = { left: 460, top: 240, right: 1460, bottom: 840 }

  it('pins the title bar where it was, on the nearer side', () => {
    expect(minimizeAnchor(start, { left: 100, top: 108, right: 400, bottom: 500 }, W, H).pinned)
      .toEqual({ pos: 'tl', x: 100 / W * 100, y: 10 })
    expect(minimizeAnchor(start, { left: 1500, top: 108, right: 1800, bottom: 500 }, W, H).pinned)
      .toEqual({ pos: 'tr', x: 1800 / W * 100, y: 10 })
  })

  it('remembers a copy of the old anchor', () => {
    const anchor = { ...start }
    const state = minimizeAnchor(anchor, rect, W, H)
    anchor.x = 1
    expect(state.anchor).toEqual(start)
  })

  it('comes back exactly as it was if the bar was not moved', () => {
    const state = minimizeAnchor(start, rect, W, H)
    expect(restoreAnchor(state, { ...state.pinned }, rect, W, H)).toEqual(start)
  })

  it('opens toward the free side after being moved', () => {
    const state = minimizeAnchor(start, rect, W, H)
    const bar = { left: 1600, top: 1000, right: 1856, bottom: 1032 }
    expect(restoreAnchor(state, { pos: 'tr', x: 1856 / W * 100, y: 1000 / H * 100 }, bar, W, H))
      .toEqual({ pos: 'br', x: 1856 / W * 100, y: 1032 / H * 100 })
    const topLeft = { left: 10, top: 10, right: 266, bottom: 42 }
    expect(restoreAnchor(state, { pos: 'tl', x: 10 / W * 100, y: 10 / H * 100 }, topLeft, W, H))
      .toEqual({ pos: 'tl', x: 10 / W * 100, y: 10 / H * 100 })
  })
})

describe('Widget title bar', () => {
  it('has no move button', async () => {
    const config = { wmId: 1, wmType: 'test', wmTitle: '', wmWants: 'show', wmZorder: 1, wmFlags: [], anchor: { pos: 'tl', x: 0, y: 0 } }
    const app = createSSRApp({
      render: () => h(Widget, { config, moveHandles: 'corners' }, {
        default: () => h(WPanel, { title: 'Panel' }, { default: () => 'BODY' })
      })
    })
    app.use(createI18n({ legacy: false, locale: 'en', messages: { en: { widget: { hide: 'hide', edit: 'edit', move: 'move', delete: 'delete' } } } }))
    app.provide('wm', {})
    const html = await renderToString(app)
    for (const label of ['Edit', 'Delete', 'Minimize', 'Hide']) expect(html).toContain(`aria-label="${label}"`)
    expect(html).not.toContain('aria-label="Move"')
  })
})

describe('WPanel window buttons', () => {
  function host (over: object = {}) {
    const panels: symbol[] = []
    return {
      anchor: { pos: 'tl' },
      minimized: false,
      canMinimize: true,
      windowActions: [
        { id: 'minimize', label: 'Minimize', icon: 'fas fa-minus', action () {} },
        { id: 'hide', label: 'Hide', icon: 'fas fa-times', action () {} }
      ],
      toggleMinimize () {},
      addPanel (id: symbol) { panels.push(id) },
      removePanel () {},
      isPrimaryPanel (id: symbol) { return panels[0] === id },
      ...over
    }
  }
  async function render (cfg: object, props: object[] = [{ title: 'One' }]) {
    const app = createSSRApp({
      render: () => props.map(p => h(WPanel, p, { default: () => 'BODY' }))
    })
    app.provide('wokeWidgetConfig', cfg)
    return await renderToString(app)
  }

  it('shows the buttons on the title bar', async () => {
    const html = await render(host())
    expect(html).toContain('aria-label="Minimize"')
    expect(html).toContain('aria-label="Hide"')
  })

  it('puts them on the first titled panel only', async () => {
    const html = await render(host(), [{ title: 'One' }, { title: 'Two', sizeKey: 'two' }])
    expect(html.match(/aria-label="Hide"/g)).toHaveLength(1)
    expect(html.indexOf('aria-label="Hide"')).toBeLessThan(html.indexOf('Two'))
  })

  it('has no buttons outside a widget', async () => {
    const app = createSSRApp({ render: () => h(WPanel, { title: 'Alone' }, { default: () => 'BODY' }) })
    expect(await renderToString(app)).not.toContain('w-icon-btn')
  })

  it('collapses to the title bar, keeping the contents mounted', async () => {
    const html = await render(host({ minimized: true }), [{ title: 'One', width: '62rem', updated: 1 }])
    expect(html).toContain('width:16rem')
    expect(html).not.toContain('62rem')
    expect(html).toMatch(/style="display:none;?"[^>]*>(<!--\[-->)?BODY/)
    expect(html).not.toContain('refreshing')
    expect(html).not.toContain('ew-resize')
  })

  it('hides secondary panels while minimized', async () => {
    const html = await render(host({ minimized: true }), [{ title: 'One' }, { title: 'Two', sizeKey: 'two' }])
    expect(html).toMatch(/style="display:none;?"[^>]*data-w-panel/)
  })

  it('ignores a saved size while minimized', async () => {
    const html = await render(host({ minimized: true, wokeSizes: { main: { w: 900, h: 700 } } }))
    expect(html).not.toContain('900px')
    expect(html).not.toContain('700px')
  })
})
