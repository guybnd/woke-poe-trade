// The build detail panel looks like the game: gem colours, item art, tooltips.
import path from 'path'
import { test, expect, FIXTURES } from './harness'

const BUILDS = process.env.WOKE_POB_DIR ?? path.join(FIXTURES, 'pob')
const BUILD = process.env.WOKE_POB_BUILD ?? 'Showcase'

test('gem colours, item art and tooltips', async ({ overlay }) => {
  const { page } = overlay
  await page.setViewportSize({ width: 1920, height: 1080 })
  await overlay.boot({
    widgets: [{ wmType: 'woke-pob-builds', wmWants: 'show', buildsDir: BUILDS }],
    overlayActive: true
  })
  await overlay.widget('woke-pob-builds').getByText(BUILD, { exact: false }).first().click()
  const detail = page.locator('[data-w-panel]').filter({ hasText: 'Open in PoB' })
  await expect(detail.getByRole('button', { name: 'Gear' })).toBeVisible()
  await overlay.snap('leveling')

  const showcase = !process.env.WOKE_POB_DIR
  if (showcase) {
    const colour = async (name: string) => await detail.getByText(name, { exact: true }).first().evaluate(e => getComputedStyle(e).color)
    await expect.poll(() => colour('Arc')).toBe('rgb(127, 168, 242)') // intelligence: blue
    expect(await colour('Added Fire Damage')).toBe('rgb(234, 111, 95)') // strength: red
    expect(await colour('Portal')).toBe('rgb(230, 226, 216)') // white
    expect(await colour('Vaal Grace')).toBe('rgb(114, 207, 100)') // dexterity: green
  }

  // A gem's tooltip.
  await detail.locator('[class*="gem"]').first().hover()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await overlay.snap('gem tooltip')

  await detail.getByRole('button', { name: 'Gear' }).click()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await overlay.snap('gear')

  if (showcase) {
    // Art for a unique, a rare's base, and a base inside a magic item's name.
    const art = async (name: string) => await detail.locator('[class*="gearRow"]').filter({ hasText: name }).locator('img').getAttribute('src')
    expect(await art("Kaom's Binding")).toContain('KaomBelt')
    expect(await art('Dread Shell')).toContain('BodyStrDexInt1C')
    expect(await art('Seething Divine')).toContain('lifeflask11')
  }

  // An item's tooltip, beside the panel and not clipped by it.
  const row = detail.locator('[class*="gearRow"]').first()
  await row.hover()
  const tip = page.getByRole('tooltip')
  await expect(tip).toBeVisible()
  if (showcase) {
    await expect(tip).toContainText('Dread Shell')
    await expect(tip).toContainText('Vaal Regalia')
    await expect(tip).toContainText('Energy Shield: 412')
    await expect(tip).toContainText('Requires Level 68')
    await expect(tip).toContainText('+62 to maximum Life')
    await expect(tip).toContainText('Corrupted')
  }
  await page.waitForTimeout(600)
  await overlay.snap('item tooltip')
  const tipBox = (await tip.boundingBox())!
  const panelBox = (await detail.boundingBox())!
  expect(tipBox.x >= panelBox.x + panelBox.width || tipBox.x + tipBox.width <= panelBox.x).toBe(true)

  await page.mouse.move(5, 5)
  await expect(tip).toHaveCount(0)

  await detail.getByRole('button', { name: 'Setups' }).click()
  await overlay.snap('setups')
  await detail.getByRole('button', { name: 'Notes' }).click()
  if (showcase) {
    await expect(detail.getByText('Fire', { exact: true })).toHaveCSS('color', 'rgb(255, 85, 85)')
  }
  await overlay.snap('notes')
})
