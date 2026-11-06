// The flips panel on recorded poe.ninja prices: the verdict, each view, the
// rare-but-cheap marks, and the families beyond scarabs.
import type { Page } from '@playwright/test'
import { test, expect, fixtureText, logFixture } from './harness'

const DENSE = '**/poe.ninja/poe1/api/economy/current/dense/overviews*'
const EXCHANGE = '**/poe.ninja/poe1/api/economy/exchange/current/overview*'

// Allflame prices, 5 Nov 2026: chaos, and chaos traded in the last day.
const ORBS: Array<[string, number, number]> = [
  ["Armoursmith's Delirium Orb", 12.3, 812],
  ["Jeweller's Delirium Orb", 16.89, 1866],
  ["Blacksmith's Delirium Orb", 17.1, 1607],
  ['Whispering Delirium Orb', 7, 70],
  ['Fine Delirium Orb', 37.55, 5701],
  ["Diviner's Delirium Orb", 34.6, 496]
]
const OILS: Array<[string, number, number]> = [
  ['Violet Oil', 1.46, 124],
  ['Crimson Oil', 6.11, 437],
  ['Black Oil', 13.38, 1111],
  ['Opalescent Oil', 43.82, 402]
]

function exchangeFeed (rows: Array<[string, number, number]>) {
  return {
    core: { primary: 'chaos', items: [], rates: {} },
    items: rows.map(([name]) => ({ id: name, name })),
    lines: rows.map(([name, primaryValue, volumePrimaryValue]) => ({ id: name, primaryValue, volumePrimaryValue }))
  }
}

async function routePrices (overlay: { page: Page }) {
  const dense = JSON.parse(fixtureText('http/poe.ninja/poe1/api/economy/current/dense/overviews.json'))
  dense.itemOverviews.push(
    { type: 'DeliriumOrb', lines: ORBS.map(([name, chaos]) => ({ name, chaos, graph: [] })) },
    { type: 'Oil', lines: OILS.map(([name, chaos]) => ({ name, chaos, graph: [] })) }
  )
  dense.currencyOverviews[0].lines.push({ name: 'Primal Crystallised Lifeforce', chaos: 0.033, graph: [] })
  await overlay.page.route(DENSE, route => route.fulfill({ json: dense }))
  await overlay.page.route(EXCHANGE, route => {
    const type = new URL(route.request().url()).searchParams.get('type')
    const rows = type === 'DeliriumOrb' ? ORBS : type === 'Oil' ? OILS : []
    return route.fulfill({ json: exchangeFeed(rows) })
  })
}

test('flips: buy list, odds and rare scarabs from recorded prices', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-scarab-flip', wmWants: 'show' }] })
  const panel = overlay.widget('woke-scarab-flip')

  await expect(panel.getByText(/\d+ scarabs? worth vendoring/)).toBeVisible()
  // Volume comes from the exchange feed, so the Supply column shows, as a word.
  await expect(panel.getByRole('button', { name: /Supply/ })).toHaveAttribute('title', /currency exchange/)
  await expect(panel.getByText('Market / day')).toHaveCount(0)
  await expect(panel.getByText('Max profit / day')).toHaveCount(0)
  await expect(panel.getByRole('button', { name: /Profit each/ })).toHaveAttribute('title', /divided by 3/)
  await expect(panel.getByText('Breach of the Hive', { exact: true })).toBeVisible()
  await overlay.snap('flips-scarabs-buy')

  await panel.getByRole('button', { name: 'Odds', exact: true }).click()
  await expect(panel.getByText('Biggest sources of value')).toBeVisible()
  await expect(panel.getByText('200c+', { exact: true })).toBeVisible()
  await overlay.snap('flips-scarabs-odds')

  await panel.getByRole('button', { name: /^Rare & cheap/ }).click()
  await expect(panel.getByText('Scarab of Radiant Storms', { exact: true })).toBeVisible()
  await overlay.snap('flips-scarabs-rare')
})

test('flips: a Harvest reroll tab and a known-result tab', async ({ overlay }) => {
  await routePrices(overlay)

  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-scarab-flip', wmWants: 'show' }] })
  const panel = overlay.widget('woke-scarab-flip')

  await panel.getByRole('tab', { name: 'Delirium', exact: true }).click()
  await expect(panel.getByText(/\d+ orbs? worth rerolling/)).toBeVisible()
  await expect(panel.getByText(/of Primal lifeforce/)).toBeVisible()
  // The cost lives in settings, not on the panel.
  await expect(panel.getByText('Primal / item')).toHaveCount(0)
  await expect(panel.getByText("Armoursmith's", { exact: true })).toBeVisible()
  await overlay.snap('flips-delirium-harvest')

  // A known result has no odds to show.
  await panel.getByRole('tab', { name: 'Oils', exact: true }).click()
  await expect(panel.getByText(/\d+ oils? worth upgrading/)).toBeVisible()
  await expect(panel.getByText('Black to Opalescent Oil', { exact: true })).toBeVisible()
  // (43.82 - 3 x 13.38) / 3, per oil put in.
  await expect(panel.locator('.w-row').filter({ hasText: 'Black to Opalescent Oil' }).getByText('+1.2c')).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Odds', exact: true })).toHaveCount(0)
  await overlay.snap('flips-oils-upgrade')
})

test('flips: headers sort the buy list, profit each first', async ({ overlay }) => {
  await routePrices(overlay)
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-scarab-flip', wmWants: 'show' }] })
  const panel = overlay.widget('woke-scarab-flip')
  await panel.getByRole('tab', { name: 'Delirium', exact: true }).click()
  await expect(panel.getByText(/\d+ orbs? worth rerolling/)).toBeVisible()

  const body = panel.locator('.w-row:not(.w-row--head)')
  const column = async (n: number) => await body.locator(`> :nth-child(${n})`).allInnerTexts()
  const numbers = (cells: string[]) => cells.map(c => Number.parseFloat(c.replace(/[^\d.]/g, '')))
  const descending = (list: number[]) => list.every((v, i) => i === 0 || list[i - 1] >= v)

  const profit = numbers(await column(3))
  expect(profit.length).toBeGreaterThan(1)
  expect(descending(profit)).toBe(true)
  await overlay.snap('flips-sorted-profit')

  await panel.getByRole('button', { name: 'Profit each, sorted descending' }).click()
  await expect(panel.getByRole('button', { name: 'Profit each, sorted ascending' })).toBeVisible()
  expect(descending(numbers(await column(3)).reverse())).toBe(true)

  await panel.getByRole('button', { name: 'Sort by Orb' }).click()
  const names = await column(1)
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')))

  await panel.getByRole('button', { name: 'Sort by Supply' }).click()
  const rank = { High: 3, Medium: 2, Low: 1 }
  const supply = (await column(4)).map(c => rank[c.trim() as keyof typeof rank])
  expect(supply.every(Boolean)).toBe(true)
  expect(descending(supply)).toBe(true)
  await overlay.snap('flips-sorted-supply')
})

test('flips: the lifeforce cost set in settings changes the panel, and blank goes back to the default', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await routePrices(overlay)
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-scarab-flip', wmWants: 'show' }] })
  const panel = overlay.widget('woke-scarab-flip')
  await panel.getByRole('tab', { name: 'Delirium', exact: true }).click()
  // 30 Primal at 0.033c.
  await expect(panel.getByText(/for 1 c of Primal lifeforce/)).toBeVisible()

  await overlay.widget('menu').locator('.fa-cog').click()
  const settings = overlay.widget('settings')
  await settings.getByText('Market & investments', { exact: true }).first().click()
  const input = settings.locator('[data-setting="Lifeforce per item for Harvest rerolls"] input')
  // The panel stays mounted but hidden while settings are open.
  await input.fill('100')
  await overlay.snap('flips-settings-lifeforce')
  await expect(panel.getByText(/for 3\.3 c of Primal lifeforce/)).toBeAttached()

  await input.fill('')
  await expect(panel.getByText(/for 1 c of Primal lifeforce/)).toBeAttached()
  await expect(input).toHaveValue('')
})

test('flips: the shortcut outlines the scarab tab, and a click clears them', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-scarab-flip', stashHotkey: 'Alt + J' } as never] })
  await overlay.showScreen('screens/stash-scarab-real.png')
  const layer = overlay.page.locator('[data-stash-outlines]')
  await expect(layer).toHaveCount(0)

  await overlay.pressHotkey('Alt + J')
  await expect(layer).toBeVisible()
  await overlay.snap('flips-stash-outlines')
  expect(await layer.locator('> div').count()).toBeGreaterThan(5)

  // Nothing is left on the wrong slots after swapping tabs or moving an item.
  fakeApp.pressMouse(400, 200)
  fakeApp.releaseMouse()
  await expect(layer).toHaveCount(0)

  // The shortcut shows them again, and clears them too.
  await overlay.page.waitForTimeout(500)
  await overlay.pressHotkey('Alt + J')
  await expect(layer).toBeVisible()
  await overlay.pressHotkey('Alt + J')
  await expect(layer).toHaveCount(0)
})

test('flips: the shortcut draws nothing on a tab it cannot read', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-scarab-flip', stashHotkey: 'Alt + J' } as never] })
  await overlay.showScreen('screens/stash-general-real.png')
  await overlay.pressHotkey('Alt + J')
  await expect(overlay.page.getByText("Can't read this tab", { exact: false })).toBeVisible()
  await expect(overlay.page.locator('[data-stash-outlines]')).toHaveCount(0)
})

test('flips: clicking the dock icon outlines the stash tab, and again clears them', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-scarab-flip' }] })
  await overlay.log(logFixture('client-logs/mapping-session.txt').slice(0, 3)) // The hideout.
  await overlay.showScreen('screens/stash-scarab-real.png')
  const layer = overlay.page.locator('[data-stash-outlines]')
  await overlay.restAndClickDockIcon('scarab-flip')
  await expect(layer).toBeVisible()
  await expect.poll(() => fakeApp.game.focused).toBe(true)
  await overlay.restAndClickDockIcon('scarab-flip')
  await expect(layer).toHaveCount(0)
})

test('flips: a dock icon click the game also got reads nothing', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-scarab-flip' }] })
  await overlay.log(logFixture('client-logs/mapping-session.txt').slice(0, 3)) // The hideout.
  await overlay.showScreen('screens/stash-scarab-real.png')
  await overlay.clickDockIconAndLeave('scarab-flip')
  fakeApp.releaseMouse()
  await overlay.page.waitForTimeout(300)
  await expect(overlay.page.locator('[data-stash-outlines]')).toHaveCount(0)
})

test('flips: outlines show the stack total under the per item figure', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-scarab-flip', stashHotkey: 'Alt + J' } as never] })
  await overlay.showScreen('screens/stash-scarab-real.png')
  await overlay.pressHotkey('Alt + J')
  const layer = overlay.page.locator('[data-stash-outlines]')
  await expect(layer).toBeVisible()
  await expect(layer.locator('br').first()).toBeAttached()
  await expect(layer.locator('span').first()).toHaveText(/^[+-]\d+\.\dc[+-]\d+(\.\d)?[ck]$/)
  await overlay.snap('flips-stash-totals')
})

test('flips: the stack total can be switched off', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-scarab-flip', stashHotkey: 'Alt + J', stashTotals: false } as never] })
  await overlay.showScreen('screens/stash-scarab-real.png')
  await overlay.pressHotkey('Alt + J')
  const layer = overlay.page.locator('[data-stash-outlines]')
  await expect(layer).toBeVisible()
  await expect(layer.locator('br')).toHaveCount(0)
})

// With no prices for a tab, the note names what it found, not the Scarab tab.
for (const [shot, note] of [['stash-delve-real', 'No fossil prices yet'], ['stash-essence-real', 'No Primal lifeforce price yet']]) {
  test(`flips: the hotkey knows ${shot}`, async ({ overlay }) => {
    await overlay.boot({ widgets: [{ wmType: 'woke-scarab-flip', stashHotkey: 'Alt + J' } as never] })
    await overlay.showScreen(`screens/${shot}.png`)
    await overlay.pressHotkey('Alt + J')
    await expect(overlay.page.getByText(`${note}, so nothing to outline`)).toBeVisible()
  })
}

for (const [shot, name] of [['stash-delirium-real', 'Delirium'], ['stash-blight-real', 'Blight']]) {
  test(`flips: the hotkey outlines the ${name} tab from its own prices`, async ({ overlay }) => {
    await routePrices(overlay)
    await overlay.boot({ widgets: [{ wmType: 'woke-scarab-flip', stashHotkey: 'Alt + J' } as never] })
    await overlay.showScreen(`screens/${shot}.png`)
    await overlay.pressHotkey('Alt + J')
    const layer = overlay.page.locator('[data-stash-outlines]')
    await expect(layer).toBeVisible()
    await overlay.snap(`flips-stash-${name}`)
  })
}

test('flips: a tab with no flips says which tabs work', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-scarab-flip', stashHotkey: 'Alt + J' } as never] })
  await overlay.showScreen('screens/stash-general-real.png')
  await overlay.pressHotkey('Alt + J')
  await expect(overlay.page.getByText(/Outlines work on Scarab, Delirium, Delve, Essence and Blight/)).toBeVisible()
})

// A dock low on the screen, where a note must stand on the icon. Left, so the note can't centre on it.
const lowDock = (config: { woke?: Record<string, unknown> }) => {
  config.woke = { ...config.woke, dock: { x: 0, y: 90, vertical: false, noPeek: [], hidden: [], dismissed: {} } }
}

for (const [where, patch, size] of [['high', undefined, null], ['low', lowDock, null], ['low at 1440p', lowDock, { width: 2560, height: 1440 }]] as const) {
  test(`flips: the long note beside a ${where} icon is whole, and clear of the icon`, async ({ overlay }) => {
    await overlay.boot({ patch, widgets: [{ wmType: 'woke-scarab-flip' }] })
    if (size) await overlay.page.setViewportSize(size)
    await overlay.log(logFixture('client-logs/mapping-session.txt').slice(0, 3)) // The hideout.
    await overlay.showScreen('screens/stash-general-real.png')
    await overlay.restAndClickDockIcon('scarab-flip')
    const note = overlay.page.getByRole('status').filter({ hasText: 'Outlines work on' })
    await expect(note).toBeVisible()
    await overlay.page.waitForTimeout(400)
    const box = (await note.boundingBox())!
    const icon = (await overlay.dockIcon('scarab-flip').boundingBox())!
    const view = overlay.page.viewportSize()!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(view.width)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(view.height)
    expect(box.y + box.height <= icon.y || box.y >= icon.y + icon.height).toBe(true)
  })
}

test('flips: an unmeasured orb is marked EST, and Settings sets your own weight', async ({ overlay }) => {
  const dense = JSON.parse(fixtureText('http/poe.ninja/poe1/api/economy/current/dense/overviews.json'))
  const lines: Array<[string, number, number]> = [...ORBS, ['Kalguuran Delirium Orb', 2, 0]]
  dense.itemOverviews.push({ type: 'DeliriumOrb', lines: lines.map(([name, chaos]) => ({ name, chaos, graph: [] })) })
  dense.currencyOverviews[0].lines.push({ name: 'Primal Crystallised Lifeforce', chaos: 0.033, graph: [] })
  await overlay.page.route(DENSE, route => route.fulfill({ json: dense }))
  await overlay.page.route(EXCHANGE, route => route.fulfill({ json: exchangeFeed([]) }))
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-scarab-flip', wmWants: 'show' }] })

  const panel = overlay.widget('woke-scarab-flip')
  await panel.getByRole('tab', { name: 'Delirium', exact: true }).click()
  await expect(panel.getByText(/1 estimated/)).toBeVisible()
  const row = panel.locator('.w-row').filter({ hasText: 'Kalguuran' })
  await expect(row.getByText('EST', { exact: true })).toBeVisible()
  await overlay.snap('flips-est')

  await panel.getByRole('button', { name: 'Weights', exact: true }).click()
  const weights = overlay.page.locator('[data-flip-weights]')
  await expect(weights).toBeInViewport()
  const kalguuran = weights.getByLabel('Kalguuran', { exact: true })
  const line = kalguuran.locator('xpath=..')
  await expect(line.getByText('Estimated')).toBeVisible()
  await kalguuran.fill('25')
  await kalguuran.blur()
  await expect(kalguuran).toHaveValue('25')
  await expect(line.getByText('Yours')).toBeVisible()
  await overlay.snap('flips-weights')

  await line.getByRole('button', { name: 'Reset' }).click()
  await expect(line.getByText('Estimated')).toBeVisible()
})
