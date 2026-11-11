// The build detail panel looks like the game: gem colours, item art, tooltips.
import path from 'path'
import { test, expect, FIXTURES } from './harness'
import type { Overlay } from './harness'

const BUILDS = process.env.WOKE_POB_DIR ?? path.join(FIXTURES, 'pob')
const BUILD = process.env.WOKE_POB_BUILD ?? 'Showcase'

async function openBuild (overlay: Overlay, width: number, height: number) {
  const { page } = overlay
  await page.setViewportSize({ width, height })
  await overlay.boot({
    widgets: [{
      wmType: 'woke-pob-builds',
      wmWants: 'show',
      wmFlags: ['invisible-on-blur'],
      anchor: { pos: 'tl', x: 5, y: 12 },
      buildsDir: BUILDS,
      pobExe: '',
      pinned: [],
      activeBuild: null,
      followChars: {}
    }],
    overlayActive: true
  })
  await overlay.widget('woke-pob-builds').getByText(BUILD, { exact: false }).first().click()
  const detail = page.locator('[data-w-panel]').filter({ hasText: 'Open in PoB' })
  await expect(detail.getByRole('tab', { name: 'Gear' })).toBeVisible()
  return detail
}

test('at 1440p, where panels are zoomed, the item tooltip stays at the cursor and on screen', async ({ overlay }) => {
  const detail = await openBuild(overlay, 2560, 1440)
  await detail.getByRole('tab', { name: 'Gear' }).click()
  const row = detail.locator('[class*="gearRow"]').first()
  await row.hover()
  const rowBox = (await row.boundingBox())!
  const tip = overlay.page.getByRole('tooltip')
  await expect(tip).toBeVisible()
  await overlay.page.waitForTimeout(300)
  await overlay.snap('item tooltip 1440p')
  const tipBox = (await tip.boundingBox())!
  expect(tipBox.x).toBeCloseTo(rowBox.x + rowBox.width / 2 + 16, -1)
  expect(tipBox.x + tipBox.width).toBeLessThanOrEqual(2560)
  expect(tipBox.y + tipBox.height).toBeLessThanOrEqual(1440)
})

test('a gear row opens the price check on that item, with its stats and resistance total', async ({ overlay }) => {
  const detail = await openBuild(overlay, 1920, 1080)
  await detail.getByRole('tab', { name: 'Gear' }).click()
  const row = detail.locator('[class*="gearRow"]').filter({ hasText: 'Dread Shell' }).first()
  await row.hover()
  await row.getByRole('button', { name: /Price check/ }).or(row.getByTitle(/Price check/)).first().click()
  const panel = overlay.widget('price-check')
  await expect(panel).toContainText('total Elemental Resistance')
  await overlay.page.waitForTimeout(500)
  await overlay.snap('price check from build')
})

test('the tooltip goes away when the overlay closes', async ({ overlay }) => {
  const detail = await openBuild(overlay, 1920, 1080)
  await detail.getByRole('tab', { name: 'Gear' }).click()
  await detail.locator('[class*="gearRow"]').first().hover()
  const tip = overlay.page.getByRole('tooltip')
  await expect(tip).toBeVisible()
  // Back to the game: the panel hides and no mouseleave ever comes.
  overlay.app.focusGame(true)
  await expect(detail).toBeHidden()
  await expect(tip).toHaveCount(0)
})

test('gems by level have tooltips with no campaign widget, where their rows are disabled', async ({ overlay }) => {
  const detail = await openBuild(overlay, 1920, 1080)
  const row = detail.locator('[class*="gemRow"]').first()
  // Rows settle once the icons have loaded; a row moving away ends a hover.
  await overlay.page.waitForLoadState('networkidle')
  await row.locator('[class*="w-gem-"]').hover()
  await expect(overlay.page.getByRole('tooltip')).toBeVisible()
})

test('gem colours, item art and tooltips', async ({ overlay }) => {
  const { page } = overlay
  const detail = await openBuild(overlay, 1920, 1080)
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
  await detail.locator('[class*="w-gem-"]').first().hover()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await overlay.snap('gem tooltip')

  await detail.getByRole('tab', { name: 'Gear' }).click()
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
  // Clear of the cursor.
  const rowBox = (await row.boundingBox())!
  expect(tipBox.x).toBeGreaterThan(rowBox.x + rowBox.width / 2)

  await page.mouse.move(5, 5)
  await expect(tip).toHaveCount(0)

  await detail.getByRole('tab', { name: 'Notes' }).click()
  if (showcase) {
    await expect(detail.getByText('Fire', { exact: true })).toHaveCSS('color', 'rgb(255, 85, 85)')
  }
  await overlay.snap('notes')
})

// Guy's kind of build: same-named sets, and only the first title reads as a stage.
const LOADOUTS_FILE = 'Loadouts.xml'
const day1 = 'Day 1 No Cluster'
const later = 'Day 1.5 Clusters'
function loadoutSeed (loadouts: Record<string, unknown>) {
  return [
    {
      wmType: 'woke-pob-builds',
      wmWants: 'show' as const,
      wmFlags: ['invisible-on-blur'],
      anchor: { pos: 'tl', x: 5, y: 12 },
      buildsDir: path.join(FIXTURES, 'pob'),
      pobExe: '',
      pinned: [],
      activeBuild: LOADOUTS_FILE,
      followChars: {},
      loadouts
    },
    { wmType: 'woke-campaign', wmWants: 'show' as const }
  ]
}

test('a picked loadout reaches the other windows, is saved, and Auto undoes it', async ({ overlay }) => {
  await overlay.boot({ widgets: loadoutSeed({}), overlayActive: true })
  await overlay.replayLog('client-logs/campaign-act1.txt')
  const strip = overlay.dockIcon('campaign')
  await strip.locator('span').first().click()
  await expect(strip).toContainText(`Your links · ${day1}`)
  await expect(strip).toContainText('Arc')

  // The panel opens on the build in use.
  const detail = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Open in PoB' })
  // The set chips, not the buttons for the same set in Next and the stage costs.
  const chip = (name: string) => detail.locator('button:not([class*="next"]):not([class*="stage"])').filter({ hasText: name })
  // The campaign card stays open over part of the panel (the test reads it
  // after each pick), so chips are clicked without aiming the mouse.
  const pickChip = (name: string) => chip(name).dispatchEvent('click')
  await expect(chip(day1)).toContainText('now')

  await pickChip(later)
  await expect(chip(later)).toContainText('now')
  await expect(chip(day1)).not.toContainText('now')
  await expect(detail.getByText(`Links · ${later}`)).toBeVisible()

  // The campaign card, on another widget, follows the pick.
  await expect(strip).toContainText(`Your links · ${later}`)
  await expect(strip).toContainText('Fireball')

  // Gear tab: its set and the gems on its items are the same loadout.
  await detail.getByRole('tab', { name: 'Gear' }).dispatchEvent('click')
  await expect(chip(later)).toContainText('now')
  await expect(detail.locator('[class*="gearRow"]').filter({ hasText: 'Later Loop' })).toBeVisible()
  await expect(detail.getByText('Fireball').first()).toBeVisible()
  await overlay.snap('gear follows the picked loadout')

  // The matching tree is the one in use.
  await expect(detail.getByRole('link', { name: `${later} · now` })).toBeVisible()
  await expect.poll(() => overlay.savedWidget('woke-pob-builds')?.loadouts?.[LOADOUTS_FILE]).toEqual({ skillSet: later })

  await detail.getByRole('tab', { name: 'Leveling' }).dispatchEvent('click')
  await pickChip('Auto')
  await expect(chip(day1)).toContainText('now')
  await expect(strip).toContainText(`Your links · ${day1}`)
  await expect(chip('Auto')).toHaveCount(0)
  await expect.poll(() => overlay.savedWidget('woke-pob-builds')?.loadouts?.[LOADOUTS_FILE]).toBeUndefined()
})

test('the price check chip reads the saved loadout', async ({ overlay }) => {
  await overlay.boot({ widgets: loadoutSeed({}) })
  await overlay.replayLog('client-logs/campaign-act1.txt')
  await overlay.copyItem('items/rare-ring.txt')
  const panel = overlay.widget('price-check')
  await expect(panel.locator('[data-scope-cycle]')).toBeVisible()
  await expect(panel).not.toContainText('Your base')

  await overlay.boot({ widgets: loadoutSeed({ [LOADOUTS_FILE]: { skillSet: later } }) })
  await overlay.replayLog('client-logs/campaign-act1.txt')
  await overlay.copyItem('items/rare-ring.txt')
  await expect(overlay.widget('price-check')).toContainText('Your base · Ring')
})

test('a build that is not active says its loadout only applies once it is', async ({ overlay }) => {
  const widgets = loadoutSeed({})
  widgets[0].activeBuild = 'Showcase.xml'
  await overlay.boot({ widgets, overlayActive: true })
  await overlay.widget('woke-pob-builds').getByText('Loadouts', { exact: false }).first().click()
  const detail = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Open in PoB' })
  const hint = detail.getByText('Other windows use your active build')
  await expect(hint).toBeVisible()
  await detail.getByRole('button', { name: 'Use build' }).click()
  await expect(hint).toHaveCount(0)
})

test('a build named after your character switches once, and Undo stops it coming back', async ({ overlay }) => {
  await overlay.boot({
    widgets: [
      {
        wmType: 'woke-pob-builds',
        wmWants: 'show' as const,
        wmFlags: ['invisible-on-blur'],
        anchor: { pos: 'tl', x: 5, y: 12 },
        buildsDir: path.join(FIXTURES, 'pob'),
        pobExe: '',
        pinned: [],
        activeBuild: LOADOUTS_FILE,
        followChars: {},
        loadouts: {}
      },
      { wmType: 'woke-campaign', wmWants: 'show' as const }
    ],
    overlayActive: true
  })
  await overlay.log(['2026/11/04 18:01:12 211002121 cff94598 [INFO Client 21088] : Showcase (Witch) is now level 2'])
  const note = overlay.page.getByText('Now using Showcase for Showcase')
  await expect(note).toBeVisible()
  await overlay.page.getByRole('button', { name: 'Undo' }).click()
  await expect(note).toHaveCount(0)
  const panel = overlay.widget('woke-pob-builds')
  await panel.getByTitle('Reload builds folder').click()
  await overlay.page.waitForTimeout(300)
  await expect(note).toHaveCount(0)
  await expect(panel.getByRole('button', { name: 'Loadouts' })).toBeVisible()
})

test('the passive tree opens in the overlay, on the next tree, with what it adds', async ({ overlay }) => {
  await overlay.boot({ widgets: loadoutSeed({}), overlayActive: true })
  await overlay.replayLog('client-logs/campaign-act1.txt')
  const detail = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Open in PoB' })
  // Next's tree line: what the next tree adds; its Tree label opens it.
  const next = detail.getByTitle('Show Day 1.5 Clusters on the tree')
  await expect(next.locator('..')).toContainText('+1')
  await expect(next.locator('..')).toContainText('Holy Dominion')
  await next.click()
  const tree = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Passive tree' }).filter({ has: overlay.page.locator('canvas') }).last()
  // On its own, even from the Next card: comparing is only ever asked for.
  await expect(tree).toContainText('4 points')
  await expect(tree.getByPlaceholder('Find a stat or passive')).toHaveCount(0)
  await expect(tree).not.toContainText('+1')
  await overlay.snap('passive tree on its own')

  await tree.getByRole('switch').click()
  await expect(tree).toContainText('Changes from Day 1 No Cluster')
  await expect(tree).toContainText('+1')
  await tree.getByRole('switch').click()

  // Totals open on request; a search filters them and lights nodes.
  await tree.getByRole('button', { name: 'Totals' }).click()
  await expect(tree).toContainText('all Elemental Resistances')
  await tree.getByPlaceholder('Find a stat or passive').fill('elemental')
  await expect(tree).toContainText(/\d+ nodes lit on the tree/)
  await expect(tree).toContainText('all Elemental Resistances')
  await tree.getByPlaceholder('Find a stat or passive').fill('nothing says this')
  await expect(tree).toContainText('Nothing in this tree says that')
  await overlay.snap('passive tree totals')
  await tree.getByRole('button', { name: 'Totals' }).click()
  await expect(tree.locator('canvas').first()).toBeVisible()
  await overlay.page.waitForTimeout(800)
  await overlay.snap('passive tree')

  // Sweeps until the mouse lands on a node: its stats come up at the cursor.
  const box = (await tree.locator('canvas').first().boundingBox())!
  const tip = overlay.page.getByRole('tooltip')
  let found = false
  for (let y = box.y + 20; y < box.y + box.height && !found; y += 25) {
    for (let x = box.x + 20; x < box.x + box.width && !found; x += 25) {
      await overlay.page.mouse.move(x, y)
      found = await tip.isVisible()
    }
  }
  expect(found).toBe(true)
  await overlay.snap('passive tree tooltip')
})

function showcaseSeed () {
  return [{
    wmType: 'woke-pob-builds',
    wmWants: 'hide' as const,
    wmFlags: ['invisible-on-blur'],
    anchor: { pos: 'tl', x: 5, y: 12 },
    buildsDir: path.join(FIXTURES, 'pob'),
    pobExe: '',
    pinned: [],
    activeBuild: 'Showcase.xml',
    followChars: {},
    loadouts: {}
  }]
}

test('the price check compares an item to the one your build wears', async ({ overlay }) => {
  await overlay.boot({ widgets: showcaseSeed() })
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const chip = overlay.widget('price-check').locator('[data-swap-chip]')
  await expect(chip).toContainText('Compare to your body armour')
  await chip.hover()
  const tip = overlay.page.getByRole('tooltip')
  await expect(tip).toContainText('Against your body armour')
  await expect(tip).toContainText('Yours')
  await overlay.snap('swap check')
})

test('the build in use has a dock icon, with its links on hover', async ({ overlay }) => {
  await overlay.boot({ widgets: showcaseSeed() })
  await overlay.hoverDockIcon('pob-builds')
  const card = overlay.page.getByText('Your links')
  await expect(card).toBeVisible()
  await overlay.snap('build hover card')
})

test('two builds compare side by side, picked in the window', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ ...showcaseSeed()[0], wmWants: 'show' as const }], overlayActive: true })
  const detail = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Open in PoB' })
  await expect(detail).toContainText('Showcase')
  await detail.getByRole('button', { name: 'More' }).or(detail.getByTitle('More')).first().click()
  await overlay.page.getByText('Compare with another build').click()
  const panel = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Compare builds' })
  await expect(panel).toContainText('Pick two builds to compare')
  await panel.getByRole('combobox', { name: 'Second build' }).selectOption('Loadouts.xml')
  await expect(panel).toContainText("Gear that's different")
  await expect(panel).toContainText('Passive tree')

  // The same build twice isn't a comparison.
  await panel.getByRole('combobox', { name: 'Second build' }).selectOption('Showcase.xml')
  await expect(panel).toContainText('same build twice')

  // The list's menu still goes straight there.
  const list = overlay.widget('woke-pob-builds')
  await list.getByRole('button', { name: /Loadouts/ }).first().click({ button: 'right' })
  await overlay.page.getByText('Compare with Showcase').click()
  await expect(panel).toContainText("Gear that's different")
  await overlay.snap('compare builds')
})

test('the Gear tab says what each stage costs', async ({ overlay }) => {
  await overlay.boot({ widgets: loadoutSeed({}), overlayActive: true })
  const detail = overlay.page.locator('[data-w-panel]').filter({ hasText: 'Open in PoB' })
  await detail.getByRole('tab', { name: 'Gear' }).click()
  await expect(detail.getByText('Cost of each stage')).toBeVisible()
  await overlay.snap('stage costs')
})
