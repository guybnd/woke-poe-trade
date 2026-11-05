// Moving and resizing overlay panels: how far a drag may go, webviews letting
// go of the mouse, and a dragged size beating the panel's starting size.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clampDrag, releaseWebviewsForDrag } from '@/web/woke/ui/snap'
import { anchorShare, fitOffset, heightCap, resizeAxis, unzoom } from '@/web/woke/ui/panel-fit'
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
  async function render (
    wokeSizes?: Record<string, { w?: number, h?: number }>,
    anchor = { pos: 'tl', x: 30, y: 25 },
    props: Record<string, unknown> = { width: '60vw', height: '75vh', maxHeight: 'none' },
    canMove = true
  ) {
    const app = createSSRApp({
      render: () => h(WPanel, { sizeKey: 'browser', ...props })
    })
    app.provide('wokeWidgetConfig', { anchor, wokeSizes, canMove })
    return await renderToString(app)
  }
  const handles = (html: string) => html.match(/<span[^>]*class="[^"]*(edgeX|edgeY|grip)/g)?.length ?? 0

  it('starts at the size it was given, as a real share of the window', async () => {
    const html = await render()
    expect(html).toContain('width:calc(60vw / var(--w-ui-scale, 1))')
    expect(html).toContain('height:calc(75vh / var(--w-ui-scale, 1))')
  })

  it('uses the size the user dragged it to', async () => {
    const html = await render({ browser: { w: 900, h: 500 } })
    expect(html).toContain('width:900px')
    expect(html).toContain('height:500px')
    expect(html).not.toContain('60vw')
    expect(html).not.toContain('height:75vh')
    expect(html).not.toContain('height:calc(75vh /')
  })

  it('stops at the screen edge however it is anchored', async () => {
    const top = 'max-height:calc(max(75vh - 4px, 240px) / var(--w-ui-scale, 1))'
    expect(await render()).toContain(top)
    expect(await render({ browser: { h: 900 } })).toContain(top)
    expect(await render({ browser: { h: 900 } }, { pos: 'br', x: 90, y: 60 })).toContain('max(60vh - 4px')
    expect(await render({ browser: { h: 900 } }, { pos: 'cc', x: 50, y: 70 })).toContain('max(60vh - 4px')
  })

  it('caps a panel with its own max height by the room left too', async () => {
    const html = await render(undefined, { pos: 'tl', x: 30, y: 50 }, { maxHeight: '75vh' })
    expect(html).toContain('max-height:min(calc(75vh / var(--w-ui-scale, 1)), calc(max(50vh - 4px, 240px) / var(--w-ui-scale, 1)))')
  })

  it('has every edge and corner on a widget that can move', async () => {
    expect(handles(await render())).toBe(8)
  })

  it('has only the far sides on a widget that cannot move', async () => {
    const html = await render(undefined, { pos: 'tl', x: 30, y: 25 }, {}, false)
    expect(handles(html)).toBe(3)
  })
})

describe('unzoom', () => {
  it('divides viewport units by the UI scale', () => {
    expect(unzoom('75vh')).toBe('calc(75vh / var(--w-ui-scale, 1))')
    expect(unzoom('60vw')).toBe('calc(60vw / var(--w-ui-scale, 1))')
  })

  it('leaves other lengths alone', () => {
    for (const v of ['26rem', '900px', 'auto', 'none', undefined]) expect(unzoom(v)).toBe(v)
  })
})

describe('heightCap', () => {
  it('measures from the anchor to the far screen edge', () => {
    expect(heightCap('tl', 10)).toContain('max(90vh - 4px')
    expect(heightCap('bl', 10)).toContain('max(10vh - 4px')
    expect(heightCap('cr', 30)).toContain('max(60vh - 4px')
  })
})

describe('fitOffset', () => {
  it('leaves a box on screen alone', () => {
    expect(fitOffset({ left: 0, top: 0, right: W, bottom: H }, W, H)).toEqual({ x: 0, y: 0 })
  })

  it('pulls a box back from any edge', () => {
    expect(fitOffset({ left: 1800, top: 900, right: 2100, bottom: 1200 }, W, H)).toEqual({ x: -180, y: -120 })
    expect(fitOffset({ left: -50, top: -20, right: 300, bottom: 300 }, W, H)).toEqual({ x: 50, y: 20 })
  })

  it('keeps the top left on screen when the box is too big to fit', () => {
    expect(fitOffset({ left: 100, top: 100, right: 2200, bottom: 1300 }, W, H)).toEqual({ x: -100, y: -100 })
    expect(fitOffset({ left: -100, top: -100, right: 2000, bottom: 1100 }, W, H)).toEqual({ x: 100, y: 100 })
  })
})

describe('resizeAxis', () => {
  const base = { size: 500, room: 1000, scale: 1, min: 200, share: 0 }

  it('grows toward the mouse', () => {
    expect(resizeAxis({ ...base, side: 'end', delta: 100 }).size).toBe(600)
    expect(resizeAxis({ ...base, side: 'start', delta: -100 }).size).toBe(600)
  })

  // Left edge, left-anchored: the anchor follows the mouse.
  it('moves the anchor so the far edge stays put', () => {
    expect(resizeAxis({ ...base, side: 'start', delta: -100, share: 0 }).shift).toBe(-100)
    expect(resizeAxis({ ...base, side: 'start', delta: -100, share: 1 }).shift).toBeCloseTo(0)
    expect(resizeAxis({ ...base, side: 'end', delta: 100, share: 0 }).shift).toBe(0)
    expect(resizeAxis({ ...base, side: 'end', delta: 100, share: 1 }).shift).toBe(100)
    expect(resizeAxis({ ...base, side: 'end', delta: 100, share: 0.5 }).shift).toBe(50)
    expect(resizeAxis({ ...base, side: 'start', delta: -100, share: 0.5 }).shift).toBe(-50)
  })

  it('stops the moving edge at the screen', () => {
    expect(resizeAxis({ ...base, side: 'end', delta: 900, room: 40 }).size).toBe(540)
    expect(resizeAxis({ ...base, side: 'start', delta: -900, room: 40 })).toEqual({ size: 540, shift: -40 })
  })

  it('can shrink a panel with no room left, even one past the screen', () => {
    expect(resizeAxis({ ...base, side: 'end', delta: -100, room: -300 }).size).toBe(400)
  })

  it('stops at the smallest size without moving the far edge', () => {
    expect(resizeAxis({ ...base, side: 'start', delta: 900 })).toEqual({ size: 200, shift: 300 })
  })

  it('does not jump a panel already below the smallest size', () => {
    expect(resizeAxis({ ...base, size: 150, side: 'end', delta: 0 }).size).toBe(150)
  })

  it('works in zoomed panel px', () => {
    const a = resizeAxis({ ...base, size: 675, scale: 1.35, side: 'end', delta: 135, share: 1 })
    expect(a.size).toBe(600)
    expect(a.shift).toBeCloseTo(135)
  })
})

describe('anchorShare', () => {
  it('reads each axis of the anchor', () => {
    expect(anchorShare('tl', 'x')).toBe(0)
    expect(anchorShare('tr', 'x')).toBe(1)
    expect(anchorShare('tc', 'x')).toBe(0.5)
    expect(anchorShare('tl', 'y')).toBe(0)
    expect(anchorShare('bl', 'y')).toBe(1)
    expect(anchorShare('cl', 'y')).toBe(0.5)
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
