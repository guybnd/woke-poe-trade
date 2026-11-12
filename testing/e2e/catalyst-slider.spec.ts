// A catalysed row's slider stripes the part only catalysed items reach, and says so
// once the min leaves out every item without catalyst quality (Guy's pick B).
import { test, expect } from './harness'

for (const style of ['poe', 'standard']) {
  test(`${style}: the catalyst-only part of the slider is marked`, async ({ overlay }) => {
    await overlay.boot({ patch: (config: any) => { config.widgets.find((w: { wmType: string }) => w.wmType === 'price-check').wokeWindowStyle = style } })
    await overlay.copyItem('items/unique-belt-catalysed.txt')
    const win = overlay.page.locator('#price-window')
    await expect(win).toContainText('Elemental Damage with Attack Skills')
    const line = win.locator('.w-poe-line', { hasText: 'Elemental Damage with Attack Skills' })
    if (await line.count()) await line.locator('.w-poe-line-text').click()
    // Only the catalysed row gets a band.
    await expect(win.locator('[data-catalyst-band]')).toHaveCount(1)
    const row = win.locator('div', { has: overlay.page.locator('[data-catalyst-band]') })
      .filter({ hasText: 'Elemental Damage with Attack Skills' }).last()
    const input = row.locator('input.w-roll-input').first()
    await input.fill('24')
    await expect(win.locator('[data-catalyst-hint]')).toHaveCount(0)
    await expect(input).not.toHaveClass(/w-roll-cat/)
    await input.fill('27')
    await expect(win.locator('[data-catalyst-hint]')).toHaveText('Above 25: only catalysed items match.')
    await input.blur()
    await expect(input).toHaveClass(/w-roll-cat/)
    await overlay.snap(`${style} catalyst slider`)
  })
}
