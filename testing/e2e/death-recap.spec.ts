// The dock icon stays away until a death, its card names the checked map's mods,
// and the panel keeps the list across a restart of the page.
import fs from 'fs'
import path from 'path'
import { test, expect, haveOcr } from './harness'

const now = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
const area = (id: string, seed: string, level = 83) =>
  `${now()} 18884906 1186a8a3 [DEBUG Client 34092] Generating level ${level} area "${id}" with seed ${seed}`
const info = (text: string) => `${now()} 18887484 cffb065b [INFO Client 34092] ${text}`

const SLOW = { timeout: 20_000 }

test('Death recap: no icon until a death, then the checked map\'s mods', async ({ overlay, fakeApp }) => {
  fs.rmSync(path.join(fakeApp.opts.userData, 'woke-death-recap'), { recursive: true, force: true })
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  const icon = overlay.dockIcon('death-recap')
  await overlay.log([area('HideoutArenaSearingExarch', '1', 60), info(': You have entered Searing Hideout.')])
  await expect(icon).toHaveCount(0)

  await overlay.copyItem('items/map-rare-t16-deadly.txt', 'Alt + M')
  await expect(overlay.page.locator('body')).toContainText('Cemetery')
  // The map check took focus; back to playing, where the dock shows.
  overlay.app.focusGame(true)
  await overlay.page.waitForTimeout(300)
  await overlay.log([
    area('MapWorldsCemetery', '42'),
    info(': You have entered Cemetery.'),
    info('The Maven: Show me.'),
    info(': luminyahu has been slain.')
  ])
  await expect(icon).toBeVisible(SLOW)
  await expect(icon).toContainText('1')

  await expect(async () => {
    await overlay.hoverDockIcon('death-recap')
    await expect(overlay.page.locator('[data-death-card]')).toBeVisible({ timeout: 1500 })
  }).toPass(SLOW)
  const card = overlay.page.locator('[data-death-card]')
  await expect(card).toContainText('Cemetery')
  await expect(card).toContainText('1st death')
  await expect(card).toContainText('The Maven')
  await expect(card).toContainText('Exact')
  await expect(card).toContainText('Players cannot Regenerate Life, Mana or Energy Shield')

  // A second map nobody checked has no mods to show, and says why.
  await overlay.log([
    area('HideoutArenaSearingExarch', '1', 60),
    area('MapWorldsBeach', '43'),
    info(': You have entered Beach.'),
    info(': luminyahu has been slain.')
  ])
  await expect(icon).toContainText('2', SLOW)
  await expect(card).toContainText('Beach', SLOW)
  await expect(card).toContainText('Unknown')

  // One click from the card to the whole log, with the selected death's mods.
  await card.locator('[data-death-open]').click()
  const rows = overlay.page.locator('[data-death-row]')
  await expect(rows).toHaveCount(2, SLOW)
  await expect(rows.nth(0)).toContainText('Mods unknown')
  await expect(rows.nth(1)).toContainText('Exact')
  await rows.nth(1).click()
  const panel = overlay.widget('woke-death-recap')
  await expect(panel.locator('[data-death-mod]', { hasText: 'Players cannot Regenerate' })).toBeVisible()
  await expect(panel).toContainText('Mods you die to')
  await overlay.snap('death-recap-panel')

  // Saved for the next start.
  const saved = path.join(fakeApp.opts.userData, 'woke-death-recap', 'deaths.json')
  await expect.poll(() => fs.existsSync(saved) ? JSON.parse(fs.readFileSync(saved, 'utf8')).deaths.length : 0, SLOW).toBe(2)
  const history = JSON.parse(fs.readFileSync(saved, 'utf8'))
  expect(history.runs).toHaveLength(1)
  expect(history.runs[0]).toMatchObject({ key: 'MapWorldsCemetery:42', match: 'exact', tier: 16 })
})

test('Death recap reads the game\'s mod list on entering a map, with no check', async ({ overlay, fakeApp }) => {
  test.skip(!haveOcr, 'OCR files missing: npm run get:ocr')
  fs.rmSync(path.join(fakeApp.opts.userData, 'woke-death-recap'), { recursive: true, force: true })
  await overlay.boot({ widgets: [{ wmType: 'woke-map-mods' }] })
  await overlay.showScreen('screens/area-mods-real-1.png')
  await overlay.log([area('MapWorldsJungleValley', '77'), info(': You have entered Jungle Valley.')])

  const saved = path.join(fakeApp.opts.userData, 'woke-death-recap', 'deaths.json')
  const runs = () => fs.existsSync(saved) ? JSON.parse(fs.readFileSync(saved, 'utf8')).runs : []
  await expect.poll(runs, SLOW).toHaveLength(1)
  expect(runs()[0]).toMatchObject({ key: 'MapWorldsJungleValley:77', match: 'screen', unknown: [] })
  expect(runs()[0].mods).toContainEqual({ matcher: 'Monsters deal #% extra Physical Damage as Lightning', roll: 137 })
  expect(runs()[0].mods).toHaveLength(8)

  await overlay.log([info(': luminyahu has been slain.')])
  await expect(async () => {
    await overlay.hoverDockIcon('death-recap')
    await expect(overlay.page.locator('[data-death-card]')).toBeVisible({ timeout: 1500 })
  }).toPass(SLOW)
  const card = overlay.page.locator('[data-death-card]')
  await expect(card).toContainText('From screen')
  await expect(card).toContainText('Players are Cursed with Elemental Weakness')
})
