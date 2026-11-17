// The overlay draws without the GPU, so every compositor layer over a panel is
// drawn again on each frame it moves. Two things used to pile layers onto a
// panel for good: the opening animation held at its last frame, and
// will-change while dragging. With the loot filter editor that meant about 50
// layers and drags dropping to 12 fps.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { test, expect, FIXTURES } from './harness'

test('an opened panel keeps no live animation, and a drag moves it without promoting it to a layer', async ({ overlay, fakeApp }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.copyFileSync(path.join(FIXTURES, 'filters', 'neversink-sample.filter'), path.join(dir, 'NeverSink.filter'))
  await overlay.boot({ widgets: [{ wmType: 'woke-loot-filter', wmFlags: ['invisible-on-blur'], sampleHotkey: 'Alt + F', editorHotkey: 'Alt + Shift + F', folder: dir, sourceName: 'NeverSink.filter' }] })
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+Shift+F')
  await overlay.pressHotkey('Alt + Shift + F')
  const page = overlay.page
  const head = page.locator('[data-widget-drag]').filter({ hasText: 'Loot filter' }).last()
  await expect(head).toBeVisible()

  // The opening motion ends and lets go (fill "backwards", not "both").
  await expect.poll(() => page.evaluate(() =>
    document.getAnimations().filter(a => (a as CSSAnimation).animationName === 'w-enter').length
  )).toBe(0)

  const panel = page.locator('[data-w-panel]').filter({ has: head }).first()
  const before = (await panel.boundingBox())!
  const box = (await head.boundingBox())!
  await page.mouse.move(box.x + 100, box.y + box.height / 2)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + 100 + i * 8, box.y + box.height / 2 + i * 5)
  // Mid-drag: shifted with translate, no will-change.
  const mid = () => head.evaluate(el => {
    const w = el.closest('[data-w-panel]')!.parentElement!
    return { moved: w.style.translate !== '', willChange: getComputedStyle(w).willChange }
  })
  // The shift lands on the next frame.
  await expect.poll(mid).toEqual({ moved: true, willChange: 'auto' })
  await page.mouse.up()

  const after = (await panel.boundingBox())!
  expect(Math.round(after.x - before.x)).toBe(80)
  expect(Math.round(after.y - before.y)).toBe(50)
})
