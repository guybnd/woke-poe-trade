// The tally of drops you choose: +1 from the hover card while playing, maps
// counted from Client.txt, items added from the search in the overlay.
import { test, expect } from './harness'

const TYPE = 'woke-drop-counter'
const area = (id: string, seed: number) => `2026/11/06 12:00:00 3725546 1186a8a3 [DEBUG Client 25552] Generating level 83 area "${id}" with seed ${seed}`
const HIDEOUT = area('HideoutLuxurious', 1)

function seed (extra: Record<string, unknown> = {}) {
  return {
    wmType: TYPE,
    wmFlags: ['invisible-on-blur'],
    wmTitle: 'Drop counter',
    anchor: { pos: 'cc', x: 50, y: 50 },
    items: [{ type: 'Currency', name: 'Divine Orb', drops: [4] }],
    maps: 10,
    autoCountMaps: true,
    layout: 'list',
    hotkey: null,
    ...extra
  }
}

test('hover card: +1 works with the game focused, and right-click takes one off', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [seed()] })
  await overlay.log([HIDEOUT])
  const icon = overlay.dockIcon('drop-counter')
  await overlay.hoverDockIcon('drop-counter')
  const plus = icon.getByRole('button', { name: 'Add one Divine Orb' })
  await expect(plus).toBeVisible()
  await expect(icon.getByText('6 maps ago · 1 in 10')).toBeVisible()
  await overlay.snap('drop counter list card')

  const box = await plus.boundingBox()
  await overlay.moveMouse(Math.round(box!.x + box!.width / 2), Math.round(box!.y + box!.height / 2))
  await plus.click()
  await expect(icon.getByText('This map · 1 in 5')).toBeVisible()
  expect(fakeApp.game.focused).toBe(true)

  await plus.click({ button: 'right' })
  await expect(icon.getByText('6 maps ago · 1 in 10')).toBeVisible()
})

test('maps count from the log: a portal back in does not count, and side areas and hideouts do not either', async ({ overlay }) => {
  await overlay.boot({ widgets: [seed()] })
  await overlay.log([area('MapWorldsStrand', 11)])
  const icon = overlay.dockIcon('drop-counter')
  await expect(icon.getByText('11', { exact: true })).toBeVisible()
  await overlay.log([HIDEOUT, area('MapWorldsStrand', 11)])
  await overlay.log([area('MapSideArea_Vaal', 5), area('MapWorldsStrand', 11)])
  await expect(icon.getByText('11', { exact: true })).toBeVisible()
  await overlay.log([HIDEOUT, area('MapWorldsCemetery', 12)])
  await expect(icon.getByText('12', { exact: true })).toBeVisible()
})

test('the count can be left to you', async ({ overlay }) => {
  await overlay.boot({ widgets: [seed({ autoCountMaps: false })] })
  await overlay.log([HIDEOUT, area('MapWorldsStrand', 11)])
  const icon = overlay.dockIcon('drop-counter')
  await expect(icon.getByText('10', { exact: true })).toBeVisible()
})

test('strip card: a tile click adds one, and the name shows under the row', async ({ overlay }) => {
  await overlay.boot({ widgets: [seed({ layout: 'strip' })] })
  await overlay.log([HIDEOUT])
  const icon = overlay.dockIcon('drop-counter')
  await overlay.hoverDockIcon('drop-counter')
  const tile = icon.getByRole('button', { name: 'Divine Orb' })
  await expect(tile).toBeVisible()
  const box = await tile.boundingBox()
  await overlay.moveMouse(Math.round(box!.x + box!.width / 2), Math.round(box!.y + box!.height / 2))
  await tile.hover()
  await expect(icon.getByText('Divine Orb: 6 maps ago · 1 in 10')).toBeVisible()
  await overlay.snap('drop counter strip card')
  await tile.click()
  await expect(tile).toContainText('2')
})

test('panel: search adds any text as its own counter, and removing can be undone', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ ...seed(), wmWants: 'show' }] })
  const panel = overlay.widget(TYPE)
  const search = panel.getByPlaceholder('Add an item')
  await search.fill('Foil unique')
  await panel.getByRole('button', { name: /Count "Foil unique" by that name/ }).click()
  await expect(panel.getByText('Foil unique', { exact: true })).toBeVisible()
  await expect(search).toHaveValue('')
  await overlay.snap('drop counter panel')

  await panel.getByRole('button', { name: 'Remove Foil unique' }).click()
  await expect(panel.getByText('Foil unique', { exact: true })).toHaveCount(0)
  await overlay.page.getByRole('button', { name: 'Undo' }).click()
  await expect(panel.getByText('Foil unique', { exact: true })).toBeVisible()
})

test('panel: Reset counts can be undone, and removing keeps a +1 made since', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ ...seed({ items: [
    { type: 'Currency', name: 'Divine Orb', drops: [4] },
    { type: '', name: 'Foil unique', drops: [] }
  ] }), wmWants: 'show' }] })
  const panel = overlay.widget(TYPE)
  const undo = overlay.page.getByRole('button', { name: 'Undo' })

  await panel.getByRole('button', { name: 'Reset counts' }).click()
  await expect(panel.getByText('None yet')).toHaveCount(2)
  await undo.click()
  await expect(panel.getByText('6 maps ago · 1 in 10')).toBeVisible()
  await expect(panel.getByText('10', { exact: true })).toBeVisible()

  await panel.getByRole('button', { name: 'Remove Foil unique' }).click()
  await panel.getByRole('button', { name: 'Add one Divine Orb' }).click()
  await expect(panel.getByText('This map · 1 in 5')).toBeVisible()
  await undo.click()
  await expect(panel.getByText('Foil unique', { exact: true })).toBeVisible()
  await expect(panel.getByText('This map · 1 in 5')).toBeVisible()
})

test('Add an item on the card opens the overlay with the cursor in the search', async ({ overlay }) => {
  await overlay.boot({ widgets: [seed()] })
  await overlay.log([HIDEOUT])
  const icon = overlay.dockIcon('drop-counter')
  await overlay.hoverDockIcon('drop-counter')
  const add = icon.getByRole('button', { name: 'Add an item' })
  await expect(add).toBeVisible()
  const box = await add.boundingBox()
  await overlay.moveMouse(Math.round(box!.x + box!.width / 2), Math.round(box!.y + box!.height / 2))
  await add.click()
  await expect(overlay.widget(TYPE).getByPlaceholder('Add an item')).toBeFocused()
})

test('a new widget starts empty and opens',async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: TYPE }] })
  const panel = overlay.widget(TYPE)
  await expect(panel.getByText('Add the drops you want to count.')).toBeVisible()
})
