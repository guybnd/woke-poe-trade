// The price check's side window says what an item is made from, makes, drops
// from and which cards give it. Checking one Lost Unity ring shows all five
// rings, Lost Unity, and the parts' total. Nothing searches until a click.
import { test, expect } from './harness'

test('side window: a Lost Unity ring lists the recipe with prices', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/unique-will-of-uul-netol.txt')
  const page = overlay.page
  const side = page.locator('.w-pc-side')
  await expect(side).toBeVisible({ timeout: 20_000 })
  await expect(side.getByText('Lost Unity recipe')).toBeVisible()
  for (const ring of ['The Will of Xoph', 'The Will of Tul', 'The Will of Esh', 'The Sundered Will']) {
    await expect(side.locator('button[data-item-row]', { hasText: ring })).toBeVisible()
  }
  // The ring being checked is its own row, not a click.
  await expect(side.locator('div[data-item-row]', { hasText: 'The Will of Uul-Netol' })).toBeVisible()
  await expect(side.getByText('Makes', { exact: true })).toBeVisible()
  // 40 + 35 + 30 + 25; The Sundered Will has no poe.ninja price in the fixture,
  // and Lost Unity is 900c at 180c a divine.
  await expect(side.getByText(/Parts\s*130 c/)).toBeVisible()
  await expect(side.getByText('1 unpriced')).toBeVisible()
  await expect(side.getByText(/Makes\s*5 div/)).toBeVisible()
  // Where the rings drop, from the item data's drop groups.
  await expect(side.getByText('Drops from')).toBeVisible()
  await expect(side.locator('button[data-item-row]', { hasText: 'Hivebrain Gland' })).toBeVisible()

  const result = side.locator('button[data-item-row]', { hasText: 'Lost Unity' })
  await result.click()
  const panel = overlay.widget('price-check')
  await expect(panel.getByText('Lost Unity').first()).toBeVisible()
  // Lost Unity's own check lists the same recipe, with Lost Unity as itself.
  await expect(side.locator('div[data-item-row]', { hasText: 'Lost Unity' })).toBeVisible()
})

test('side window: a Breach unique lists its Flesh of Xesht upgrade', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/unique-skin-of-the-lords.txt')
  const side = overlay.page.locator('.w-pc-side')
  await expect(side).toBeVisible({ timeout: 20_000 })
  await expect(side.getByText('Upgrade to Skin of the Lords')).toBeVisible()
  await expect(side.locator('button[data-item-row]', { hasText: 'Skin of the Loyal' })).toBeVisible()
  await expect(side.locator('button[data-item-row]', { hasText: 'Flesh of Xesht' })).toBeVisible()
  // The Chayula group is a recipe now, not "Drops in".
  await expect(side.getByText(/^Drops in /)).toHaveCount(0)
})

test('side window: Headhunter lists the cards that give it, priced as a stack', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/unique-headhunter.txt')
  const side = overlay.page.locator('.w-pc-side')
  await expect(side).toBeVisible({ timeout: 20_000 })
  await expect(side.getByText('Cards that give it')).toBeVisible()
  // 8 × 900c at 180c a divine.
  const doctor = side.locator('button[data-item-row]', { hasText: 'The Doctor' })
  // The Doctor, The Nurse, The Patient group isn't listed again under Drops from.
  await expect(doctor).toHaveCount(1)
  await expect(doctor).toContainText('8 ×')
  await expect(doctor).toContainText('40')
  await expect(side.locator('button[data-item-row]', { hasText: 'The Fiend' })).toContainText('corrupted')
})

test('side window: a Timeless jewel lists its conquerors\' keystones and the emblems', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/unique-brutal-restraint-330.txt')
  const page = overlay.page
  const side = page.locator('.w-pc-side')
  await expect(side).toBeVisible({ timeout: 20_000 })
  const keys = side.locator('[data-keystone-row]')
  await expect(keys).toHaveText([/The Traitor\s*Balbala/, /Dance with Death\s*Asenath/, /Second Sight\s*Nasima/])
  // The splinter "recipe" isn't in the game (Guy): the emblems are listed instead.
  await expect(side.getByText('Brutal Restraint recipe')).toHaveCount(0)
  await expect(side.getByText('Drops in Timeless Conflict')).toBeVisible()
  for (const who of ['Karui', 'Maraketh', 'Eternal', 'Templar', 'Vaal']) {
    await expect(side.locator('[data-item-row]', { hasText: `Timeless ${who} Emblem` })).toBeVisible()
  }
  await expect(side.locator('[data-item-row]', { hasText: 'Timeless Maraketh Emblem' })).toContainText('its own')

  // A keystone's hover is the keystone, as the tree shows it.
  await keys.nth(2).hover()
  await expect(page.getByRole('tooltip')).toContainText('You are Blind')
  await overlay.snap('timeless-keystones')

  // A click: that conqueror's line alone, no number.
  await keys.nth(2).click()
  const panel = overlay.widget('price-check')
  const row = panel.locator('.w-pc-modtext, .search-text', { hasText: 'Nasima' }).first()
  await expect(row).toBeVisible()
  const nasima = panel.locator('input.w-roll-input').nth(4)
  await expect(nasima).toHaveValue('')
})

test('number boxes: the × keeps the line and empties both', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/unique-brutal-restraint-330.txt')
  const panel = overlay.widget('price-check')
  const clear = panel.locator('[data-clear-nums]').first()
  const box = panel.locator('input.w-roll-input').first()
  await expect(box).toHaveValue('7993', { timeout: 20_000 })
  await box.hover()
  await expect(clear).toBeVisible()
  await overlay.snap('clear-numbers')
  await clear.click()
  await expect(box).toHaveValue('')
  await expect(panel.locator('input.w-roll-input').nth(1)).toHaveValue('')
  await expect(panel.locator('[data-clear-nums]')).toHaveCount(2)
})

test('side window: the Abyss conquest jewels show the keystone each gives', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/unique-baleful-dominion.txt')
  const side = overlay.page.locator('.w-pc-side')
  await expect(side).toBeVisible({ timeout: 20_000 })
  // The Reclaimed Malevolence recipe already lists all five: each gets its keystone.
  await expect(side.getByText('Reclaimed Malevolence recipe')).toBeVisible()
  await expect(side.locator('div[data-item-row]', { hasText: 'Baleful Dominion' })).toContainText('Reconstructed Essence')
  await side.getByText('Reconstructed Essence').hover()
  await expect(overlay.page.getByRole('tooltip')).toContainText('Life Recoup also recovers Mana')
  await overlay.snap('abyss-keystones')
  for (const [jewel, key] of [['Destructive Aspiration', 'The Loyal Few'], ['Extinguishing Grasp', 'Weighted Exchange'], ['Festering Vengeance', 'Overwhelming Hate'], ['Reclaimed Malevolence', 'Zorath']]) {
    await expect(side.locator('button[data-item-row]', { hasText: jewel })).toContainText(key)
  }
})

test('side window: Dawnbreaker drops from the invitation, a click, with the boss\'s other drops', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/unique-dawnbreaker.txt')
  const side = overlay.page.locator('.w-pc-side')
  await expect(side).toBeVisible({ timeout: 20_000 })
  await expect(side.getByText('Drops from')).toBeVisible()
  // The invitation price checks like any other row.
  await expect(side.locator('button[data-item-row]', { hasText: 'Incandescent Invitation' })).toBeVisible()
  await expect(side.getByText('Also drops', { exact: true })).toBeVisible()
  for (const other of ['Forbidden Flame', 'Dawnstrider']) {
    await expect(side.locator('button[data-item-row]', { hasText: other })).toBeVisible()
  }
  await expect(side.locator('[data-item-row]', { hasText: 'Dawnbreaker' })).toHaveCount(0)
})
