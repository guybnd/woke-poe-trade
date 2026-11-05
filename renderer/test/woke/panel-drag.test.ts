// Moving and resizing overlay panels: how far a drag may go, webviews letting
// go of the mouse, and a dragged size beating the panel's starting size.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clampDrag, releaseWebviewsForDrag } from '@/web/woke/ui/snap'
import WPanel from '@/web/woke/ui/WPanel.vue'

const W = 1920
const H = 1080

describe('clampDrag', () => {
  it('keeps a small widget fully on screen', () => {
    const rect = { left: 1500, top: 100, right: 1800, bottom: 300 }
    expect(clampDrag(rect, 500, 2000, W, H)).toEqual({ dx: 120, dy: 780 })
    expect(clampDrag(rect, -3000, -3000, W, H)).toEqual({ dx: -1500, dy: -100 })
  })

  it('leaves a small widget against the edge free to move back', () => {
    const rect = { left: 1538, top: 154, right: W, bottom: 310 }
    expect(clampDrag(rect, 60, 0, W, H).dx).toBe(0)
    expect(clampDrag(rect, -60, 40, W, H)).toEqual({ dx: -60, dy: 40 })
  })

  it('lets a big panel filling the screen corner move right and down', () => {
    // The trade search browser at its default spot: 30%/25%, touching both edges.
    const rect = { left: 576, top: 270, right: W, bottom: H }
    expect(clampDrag(rect, 300, 200, W, H)).toEqual({ dx: 300, dy: 200 })
  })

  it('always leaves part of a big panel to grab', () => {
    const rect = { left: 576, top: 270, right: W, bottom: H }
    expect(clampDrag(rect, 5000, 0, W, H).dx).toBe(W - 160 - 576)
  })

  it('never moves the title bar past the top or left', () => {
    const rect = { left: 576, top: 270, right: W, bottom: H }
    expect(clampDrag(rect, -5000, -5000, W, H)).toEqual({ dx: -576, dy: -270 })
  })

  it('does not jump a widget already hanging off the screen', () => {
    const rect = { left: 1800, top: 100, right: 2100, bottom: 200 }
    expect(clampDrag(rect, 0, 0, W, H)).toEqual({ dx: 0, dy: 0 })
  })
})

describe('releaseWebviewsForDrag', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('turns webview mouse input off for the drag and back on after', () => {
    const style = {
      pointerEvents: '',
      removeProperty (name: string) { if (name === 'pointer-events') this.pointerEvents = '' }
    }
    const querySelectorAll = vi.fn(() => [{ style }])
    vi.stubGlobal('document', { querySelectorAll })

    const restore = releaseWebviewsForDrag()
    expect(querySelectorAll).toHaveBeenCalledWith('webview')
    expect(style.pointerEvents).toBe('none')

    restore()
    expect(style.pointerEvents).toBe('')
  })
})

describe('WPanel size', () => {
  async function render (wokeSizes?: Record<string, { w?: number, h?: number }>) {
    const app = createSSRApp({
      render: () => h(WPanel, { sizeKey: 'browser', width: '60vw', height: '75vh', maxHeight: 'none' })
    })
    app.provide('wokeWidgetConfig', { anchor: { pos: 'tl', y: 25 }, wokeSizes })
    return await renderToString(app)
  }

  it('starts at the size it was given', async () => {
    const html = await render()
    expect(html).toContain('width:60vw')
    expect(html).toContain('height:75vh')
  })

  it('uses the size the user dragged it to', async () => {
    const html = await render({ browser: { w: 900, h: 500 } })
    expect(html).toContain('width:900px')
    expect(html).toContain('height:500px')
    expect(html).not.toContain('60vw')
    expect(html).not.toContain('height:75vh')
  })

  it('stops at the screen bottom so the resize handle stays reachable', async () => {
    expect(await render()).toContain('max-height:calc(75vh - 4px)')
    expect(await render({ browser: { h: 900 } })).toContain('max-height:calc(75vh - 4px)')
  })
})

describe('widget templates', () => {
  function vueFiles (dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const p = path.join(dir, name)
      if (statSync(p).isDirectory()) return vueFiles(p)
      return p.endsWith('.vue') ? [p] : []
    })
  }

  it('never give a WPanel its size in an inline style, which beats the saved size', () => {
    const root = path.resolve(__dirname, '../../src/web/woke')
    const offenders = vueFiles(root).filter((file) => {
      const tags = readFileSync(file, 'utf8').match(/<WPanel\b[^>]*>/g) ?? []
      return tags.some(tag => /\bstyle="[^"]*\b(width|height)\s*:/.test(tag))
    })
    expect(offenders).toEqual([])
  })
})
