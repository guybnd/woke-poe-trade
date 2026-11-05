// What the app does in the game window: typing stash searches, and
// panels that come and go with the zone you're in.
import { test, expect, logFixture } from './harness'

test('regex library: clicking a saved string searches the stash in game', async ({ overlay, fakeApp }) => {
  await overlay.boot({
    overlayActive: true,
    // Open the library's tab (it's placed, closed, by default).
    patch: c => { c.widgets.find((w: { wmType: string }) => w.wmType === 'woke-regex-library').wmWants = 'show' }
  })
  const library = overlay.widget('woke-regex-library')
  await library.getByText('No reflect', { exact: true }).click()
  // The app went back to the game and typed Ctrl+F, pasted, Enter.
  await expect.poll(() => fakeApp.game.stashSearches).toEqual(['"!eflec"'])
  expect(fakeApp.game.focused).toBe(true)
})

test('regex library icon: a click opens the card, and its strings can be clicked without the overlay key', async ({ overlay, fakeApp }) => {
  // Mechanics reads the game log, which is how the dock knows the zone.
  await overlay.boot({ widgets: [{ wmType: 'woke-mechanics' }] })
  await overlay.log(logFixture('client-logs/mapping-session.txt').slice(0, 3)) // The hideout.
  const icon = overlay.dockIcon('regex-library')
  const entry = icon.getByRole('button', { name: 'No reflect', exact: true })

  // A click opens the card even with the game focused. Away first: main remembers
  // the mouse from the test before, and hovering would already have opened it.
  await overlay.moveMouse(1000, 900)
  await expect(entry).toHaveCount(0, { timeout: 2000 })
  await overlay.clickDockIconAndLeave('regex-library')
  await expect(entry).toBeVisible({ timeout: 200 })
  await expect(entry).toHaveCount(0, { timeout: 2000 })

  // Resting on the icon opens it too. Over a string the game keeps focus (keys
  // still reach it) while the card takes the click.
  await overlay.hoverDockIcon('regex-library')
  await expect(entry).toBeVisible({ timeout: 2000 })
  expect(fakeApp.game.focused).toBe(true)
  const box = await entry.boundingBox()
  await overlay.moveMouse(Math.round(box!.x + box!.width / 2), Math.round(box!.y + box!.height / 2))
  await expect(entry).toBeVisible()
  expect(fakeApp.game.focused).toBe(true)
  await entry.click()
  await expect.poll(() => fakeApp.game.stashSearches).toEqual(['"!eflec"'])
  expect(fakeApp.game.focused).toBe(true)
})

test('league mechanics icon: shows in a mechanic zone, hides in the hideout', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-mechanics' }] })
  const icon = overlay.dockIcon('mechanics')
  const lines = logFixture('client-logs/mapping-session.txt')
  const upTo = (text: string) => lines.slice(0, lines.findIndex(l => l.includes(text)) + 1)

  // Strand: a plain map, nothing to show.
  await overlay.log(upTo('You have entered Strand.'))
  await expect(icon).toHaveCount(0)
  // Einhar speaks in the Cemetery map: Bestiary. Resting the mouse on the
  // icon opens its card.
  const einhar = upTo('Einhar, Beastmaster:')
  await overlay.log(einhar.slice(upTo('You have entered Strand.').length))
  await expect(icon).toBeVisible()
  await overlay.hoverDockIcon('mechanics')
  await expect(icon).toContainText('Bestiary', { timeout: 5000 })
  await overlay.snap('bestiary card from the dock icon')
  await overlay.moveMouse(1000, 900)
  // Back in the hideout: gone.
  const hideout = upTo('Generating level 68 area "Delve_Main"').slice(einhar.length, -1)
  await overlay.log(hideout)
  await expect(icon).toHaveCount(0)
  // Azurite Mine: Delve, from the zone itself.
  await overlay.log(lines.slice(einhar.length + hideout.length, lines.findIndex(l => l.includes('Azurite Mine')) + 1))
  await expect(icon).toBeVisible()
  await overlay.hoverDockIcon('mechanics')
  await expect(icon).toContainText('Delve', { timeout: 5000 })
})

test('boss runs icon: The Alluring Abyss shows Uber Atziri, and a click opens its drops', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-boss-runs' }] })
  const icon = overlay.dockIcon('boss-runs')
  await overlay.log([
    '2026/11/05 15:00:34 3725546 1186a8a3 [DEBUG Client 25552] Generating level 60 area "HideoutArenaSearingExarch" with seed 1',
    '2026/11/05 15:00:35 3727812 cffb065b [INFO Client 25552] : You have entered Searing Hideout.'
  ])
  await expect(icon).toHaveCount(0)

  await overlay.log([
    '2026/11/05 15:00:36 3725546 1186a8a3 [DEBUG Client 25552] Generating level 80 area "MapAtziri2" with seed 3345257283',
    '2026/11/05 15:00:37 3727812 cffb065b [INFO Client 25552] : You have entered The Alluring Abyss.'
  ])
  await expect(icon).toHaveCount(1)
  await overlay.hoverDockIcon('boss-runs')
  await expect(icon.getByText('Uber Atziri')).toBeVisible()
  await expect(icon.getByText('The Vertex')).toBeVisible()
  await expect(icon.getByText('41.7%')).toBeVisible()
  // Run stats wait until you've logged a kill.
  await expect(icon.getByText('Entry', { exact: true })).toHaveCount(0)
  await overlay.snap('uber atziri card from the dock icon')

  // A shared arena name doesn't mix in the other boss.
  await overlay.moveMouse(5, 5)
  await overlay.log([
    '2026/11/05 15:10:00 3725546 1186a8a3 [DEBUG Client 25552] Generating level 84 area "MapWorldsElderArenaUber" with seed 1',
    '2026/11/05 15:10:01 3727812 cffb065b [INFO Client 25552] : You have entered The Shaper\'s Realm.'
  ])
  await overlay.hoverDockIcon('boss-runs')
  await expect(icon.getByText('The Uber Elder')).toBeVisible()
  await expect(icon.getByText('The Shaper', { exact: true })).toHaveCount(0)
  // Level 84 is the normal fight, not Uber Uber Elder.
  await expect(icon.getByText('Uber Uber Elder')).toHaveCount(0)
})

test('boss runs icon: a click opens the arena boss that has a drop list', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-boss-runs' }] })
  await overlay.log([
    '2026/11/05 15:00:36 3725546 1186a8a3 [DEBUG Client 25552] Generating level 83 area "MapWorldsPrimordialBoss4" with seed 1',
    '2026/11/05 15:00:37 3727812 cffb065b [INFO Client 25552] : You have entered Absence of Symmetry and Harmony.'
  ])
  await overlay.dockIcon('boss-runs').locator('span').first().click()
  await expect(overlay.widget('woke-boss-runs').getByText('Forbidden Flesh').first()).toBeVisible()
})

test('boss runs icon: a click with the overlay open shows that boss despite the tier filter', async ({ overlay }) => {
  await overlay.boot({
    overlayActive: true,
    widgets: [{ wmType: 'woke-boss-runs' }],
    patch: c => {
      const w = c.widgets.find((w: { wmType: string }) => w.wmType === 'woke-boss-runs')
      w.wmFlags = ['invisible-on-blur']
      w.anchor = { pos: 'cc', x: 50, y: 50 }
      w.selected = 'shaper'
      w.tier = 'pinnacle'
      w.sort = 'hour'
      w.runSeconds = {}
      w.rates = {}
      w.extraDrops = {}
      w.kills = {}
      w.ownEntry = false
    }
  })
  await overlay.log([
    '2026/11/05 15:00:36 3725546 1186a8a3 [DEBUG Client 25552] Generating level 80 area "MapAtziri2" with seed 3345257283',
    '2026/11/05 15:00:37 3727812 cffb065b [INFO Client 25552] : You have entered The Alluring Abyss.'
  ])
  await overlay.dockIcon('boss-runs').locator('span').first().click()
  const panel = overlay.widget('woke-boss-runs')
  await expect(panel.getByText('Uber Atziri').first()).toBeVisible()
  await expect(panel.getByText('The Vertex').first()).toBeVisible()
  await overlay.snap('uber atziri drops panel')
})

test('a click on an icon closes its open card, which stays closed until the mouse comes back', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-mechanics' }] })
  await overlay.log(logFixture('client-logs/mapping-session.txt').slice(0, 3)) // The hideout.
  const icon = overlay.dockIcon('regex-library')
  const entry = icon.getByRole('button', { name: 'No reflect', exact: true })

  // Main remembers the mouse on this spot from the test before.
  await overlay.moveMouse(1000, 900)
  await overlay.hoverDockIcon('regex-library')
  await expect(entry).toBeVisible({ timeout: 2000 })
  const box = (await icon.boundingBox())!
  const x = Math.round(box.x + box.width / 2)
  const y = Math.round(box.y + box.height / 2)
  fakeApp.pressMouse(x, y)
  // The same click reaching the page as the button comes up doesn't reopen it.
  await icon.locator('span').first().click()
  fakeApp.releaseMouse()
  await expect(entry).toHaveCount(0, { timeout: 1000 })
  await overlay.page.waitForTimeout(400)
  await expect(entry).toHaveCount(0)

  // A second click opens it again, then leaving and coming back does too.
  await overlay.page.waitForTimeout(1200)
  fakeApp.pressMouse(x, y)
  fakeApp.releaseMouse()
  await expect(entry).toBeVisible({ timeout: 1000 })
  await overlay.moveMouse(1000, 900)
  await expect(entry).toHaveCount(0, { timeout: 2000 })
  await overlay.hoverDockIcon('regex-library')
  await expect(entry).toBeVisible({ timeout: 2000 })
  await overlay.moveMouse(1000, 900)
})

test('moving from icon to icon shows one card at a time', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-trade', ping: false }, { wmType: 'woke-mechanics' }] })
  await overlay.log(['2026/11/05 10:00:00 500000000 cff94598 [INFO Client 21088] @From Kaltenhalt: Hi, I would like to buy your Tabula Rasa Simple Robe listed for 10 chaos in Standard (stash tab "Sale"; position: left 1, top 1)'])
  await overlay.log(logFixture('client-logs/mapping-session.txt').slice(0, 3)) // The hideout.
  const regex = overlay.dockIcon('regex-library').getByRole('button', { name: 'No reflect', exact: true })
  const trade = overlay.dockIcon('trade').getByText('Kaltenhalt')

  await overlay.moveMouse(1000, 900)
  await overlay.hoverDockIcon('regex-library')
  await expect(regex).toBeVisible({ timeout: 2000 })
  await overlay.hoverDockIcon('trade')
  await expect(trade).toBeVisible({ timeout: 2000 })
  // At once, not after the usual delay on leaving.
  await expect(regex).toHaveCount(0, { timeout: 100 })
  await overlay.moveMouse(1000, 900)
})

test('with hover switched off, a card opens only on a click', async ({ overlay, fakeApp }) => {
  await overlay.boot({
    widgets: [{ wmType: 'woke-mechanics' }],
    patch: (c) => { c.woke.dock = { ...c.woke.dock, hoverOpens: false } }
  })
  await overlay.log(logFixture('client-logs/mapping-session.txt').slice(0, 3)) // The hideout.
  const icon = overlay.dockIcon('regex-library')
  const entry = icon.getByRole('button', { name: 'No reflect', exact: true })

  await overlay.moveMouse(1000, 900)
  await overlay.hoverDockIcon('regex-library')
  await overlay.page.waitForTimeout(400)
  await expect(entry).toHaveCount(0)

  const box = (await icon.boundingBox())!
  fakeApp.pressMouse(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2))
  fakeApp.releaseMouse()
  await expect(entry).toBeVisible({ timeout: 1000 })
  await overlay.moveMouse(1000, 900)
  await expect(entry).toHaveCount(0, { timeout: 2000 })
})
