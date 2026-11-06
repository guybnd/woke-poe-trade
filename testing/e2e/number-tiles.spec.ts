// The number tiles above the mods in the price check: limits, dragging from the number, typing.
import type { Locator, Page } from '@playwright/test'
import { test, expect } from './harness'

async function press (page: Page, input: Locator) {
  const box = (await input.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  return { x, y }
}

test('number tiles stop at game limits, drag from the number, and a click still types', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const page = overlay.page
  const panel = overlay.widget('price-check')
  const tile = panel.locator('div[title^="Scroll or drag"]').filter({ hasText: 'Links' })
  const links = tile.locator('input').first()
  await expect(links).toHaveValue('6')

  // Typing past the limit stops at it, also when the value was at the limit already.
  await links.click()
  await expect(links).toBeFocused()
  await page.keyboard.type('7')
  await expect(links).toHaveValue('6')
  await page.keyboard.press('Control+A')
  await page.keyboard.type('4')
  await expect(links).toHaveValue('4')
  await page.keyboard.type('7')
  await expect(links).toHaveValue('6')
  await links.blur()

  // Scrolling doesn't pass it either.
  await tile.hover()
  await page.mouse.wheel(0, -100)
  await expect(links).toHaveValue('6')
  await page.mouse.wheel(0, 100)
  await page.mouse.wheel(0, 100)
  await expect(links).toHaveValue('4')

  // Dragging from the number itself changes the value and doesn't start typing.
  // Slow: 20 px a step, so 15 px does nothing yet.
  let at = await press(page, links)
  await page.mouse.move(at.x, at.y - 15, { steps: 3 })
  await expect(links).toHaveValue('4')
  await expect(links).not.toBeFocused()
  await page.mouse.move(at.x, at.y - 25, { steps: 3 })
  await expect(links).toHaveValue('5')
  await page.mouse.move(at.x, at.y - 400, { steps: 10 })
  await expect(links).toHaveValue('6')
  await page.mouse.move(at.x, at.y - 400 + 20, { steps: 2 })
  await expect(links).toHaveValue('5')
  await page.mouse.up()
  await expect(links).not.toBeFocused()

  // The same again with the text selected, which a browser would turn into dragging the text away.
  await links.click()
  await expect(links).toBeFocused()
  at = await press(page, links)
  await page.mouse.move(at.x, at.y + 45, { steps: 6 })
  await expect(links).toHaveValue('3')
  await page.mouse.up()
  await expect(links).not.toBeFocused()

  // A plain click on the number lets you type, replacing what's there.
  await links.click()
  await page.keyboard.type('2')
  await expect(links).toHaveValue('2')

  // Pressing another number takes the focus away from this one, even if that press becomes a drag.
  const other = panel.locator('div[title^="Scroll or drag"]').filter({ hasNotText: 'Links' }).first().locator('input').first()
  at = await press(page, other)
  await expect(links).not.toBeFocused()
  await page.mouse.up()
  await expect(other).toBeFocused()
  await other.blur()
})

test('scrolling a switched-off tile already at its limit leaves it off', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  const tile = panel.locator('div[title^="Scroll or drag"]').filter({ hasText: 'Links' })
  const on = await tile.getAttribute('class')
  await tile.getByRole('button').click()
  await expect(tile).not.toHaveAttribute('class', on!)
  const off = await tile.getAttribute('class')

  await tile.hover()
  await overlay.page.mouse.wheel(0, -100)
  await overlay.page.waitForTimeout(100)
  await expect(tile).toHaveAttribute('class', off!)

  // A value that does change is one you want searched.
  await overlay.page.mouse.wheel(0, 100)
  await expect(tile).toHaveAttribute('class', on!)
})

test('scrolling down on an empty max leaves it empty, and up gives one', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/rare-cluster-large.txt')
  const page = overlay.page
  const tile = overlay.widget('price-check').locator('div[title^="Scroll or drag"]').filter({ has: page.locator('input[data-bound="max"]') })
  const min = tile.locator('input').first()
  const max = tile.locator('input[data-bound="max"]')
  await expect(min).toHaveValue('84')
  await expect(max).toHaveValue('100')

  await max.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Delete')
  await max.blur()
  await expect(max).toHaveValue('')

  await max.hover()
  await page.mouse.wheel(0, 100)
  await page.waitForTimeout(100)
  await expect(max).toHaveValue('')

  await page.mouse.wheel(0, -100)
  await expect(max).toHaveValue('85')
})
