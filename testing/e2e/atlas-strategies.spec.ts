// Atlas strategies like PoB builds (Guy's pick A): the list with folders, the
// atlas tree in the middle to click passives on, the loadout on the right
// (Threads, currency, regexes kept in the Regex library). Uses GGG's live
// 3.30 atlas export, like the app.
import { test, expect } from './harness'
import type { Overlay } from './harness'

const DATA = 'https://raw.githubusercontent.com/grindinggear/atlastree-export/master/data.json'

// A link taking the start's neighbours and a few steps out: a real path.
async function smallTreeLink (): Promise<string> {
  const res = await fetch(DATA)
  if (!res.ok) throw new Error(`Atlas data answered ${res.status}`)
  const { nodes } = await res.json() as { nodes: Record<string, { out?: string[], in?: string[], isMastery?: boolean }> }
  const start = nodes.root.out![0]
  const links = (id: string) => [...(nodes[id]?.out ?? []), ...(nodes[id]?.in ?? [])].filter(x => nodes[x] && !nodes[x].isMastery)
  const taken: string[] = []
  let at = start
  for (let i = 0; i < 6; i++) {
    const next = links(at).find(x => x !== start && !taken.includes(x))
    if (!next) break
    taken.push(next)
    at = next
  }
  const bytes = Buffer.alloc(9 + taken.length * 2)
  bytes.writeUInt32BE(6, 0)
  bytes.writeUInt8(taken.length, 6)
  taken.forEach((id, i) => bytes.writeUInt16BE(Number(id), 7 + i * 2))
  return `https://www.pathofexile.com/fullscreen-atlas-skill-tree/${bytes.toString('base64url')}`
}

async function bootAtlas (overlay: Overlay, treeUrl: string) {
  await overlay.boot({
    overlayActive: true,
    widgets: [{
      wmType: 'woke-atlas-strategies',
      wmTitle: 'Atlas strategies',
      wmWants: 'show',
      wmFlags: ['invisible-on-blur'],
      anchor: { pos: 'tl', x: 2, y: 8 },
      dataUrl: '',
      selectedId: 1,
      strategies: [
        { id: 1, name: 'Breach threads', folder: 'Juicing', league: '', tags: [], treeUrl, threads: [{ type: 'Breach', count: 8 }], scarabs: '1x Vaal Orb\n1x Orb of Alchemy', device: '', regex: '', notes: '' },
        { id: 2, name: 'Alch and go', folder: 'Leaguestart', league: '', tags: [], treeUrl: '', threads: [], scarabs: '', device: '', regex: '', notes: '' }
      ]
    } as never]
  })
  return overlay.widget('woke-atlas-strategies')
}

function savedAtlas (contents: string) {
  const config = JSON.parse(contents)
  return config.widgets.find((w: { wmType: string }) => w.wmType === 'woke-atlas-strategies')
}

test('the tree edits the strategy: hover shows the path, a click takes it', async ({ overlay, fakeApp }) => {
  test.setTimeout(90_000)
  const atlas = await bootAtlas(overlay, await smallTreeLink())
  await expect(atlas.getByText('Juicing', { exact: true })).toBeVisible()
  const points = atlas.getByText(/\d+ \/ \d+ points/)
  await expect(points).toBeVisible({ timeout: 30_000 })
  const before = Number((await points.textContent())!.trim().split(' ')[0])
  expect(before).toBeGreaterThan(0)
  await overlay.page.waitForTimeout(1500)
  await overlay.snap('atlas strategies: list, tree, loadout')

  // Find a passive one click away by resting the mouse over the tree.
  const canvas = atlas.locator('canvas').last()
  const box = (await canvas.boundingBox())!
  const tip = overlay.page.getByText(/^Click to take: \d+ points?/)
  let found = false
  for (let y = 0.2; y <= 0.8 && !found; y += 0.04) {
    for (let x = 0.2; x <= 0.8 && !found; x += 0.03) {
      await overlay.page.mouse.move(box.x + box.width * x, box.y + box.height * y)
      found = await tip.isVisible()
    }
  }
  expect(found).toBe(true)
  const cost = Number((await tip.textContent())!.match(/(\d+) points?/)![1])
  await overlay.snap('hovering a passive shows the path it takes')
  fakeApp.clearReceived()
  await overlay.page.mouse.down()
  await overlay.page.mouse.up()
  await expect(points).toContainText(`${before + cost} / `)
  // The edit waits as unsaved until Save.
  await expect(atlas.getByTitle("The tree has changes you haven't saved")).toBeVisible()
  await overlay.snap('unsaved tree changes')
  await overlay.page.evaluate(() => window.dispatchEvent(new Event('blur')))
  const draft = savedAtlas((await fakeApp.waitForReceived('CLIENT->MAIN::save-config')).contents as string)
  const savedBefore = draft.strategies[0].treeUrl
  expect(draft.drafts['1']).toMatch(/fullscreen-atlas-skill-tree\//)
  expect(draft.drafts['1']).not.toBe(savedBefore)

  // Undo goes back to the saved tree, and that's not unsaved any more.
  await atlas.getByTitle('Undo (Ctrl + Z)').click()
  await expect(points).toContainText(`${before} / `)
  await expect(atlas.getByTitle("The tree has changes you haven't saved")).toHaveCount(0)

  // Redo, then Save.
  await atlas.getByTitle('Redo (Ctrl + Y)').click()
  fakeApp.clearReceived()
  await atlas.getByTitle(/^Save the tree to this strategy/).click()
  await expect(atlas.getByTitle("The tree has changes you haven't saved")).toHaveCount(0)
  await overlay.page.evaluate(() => window.dispatchEvent(new Event('blur')))
  const saved = savedAtlas((await fakeApp.waitForReceived('CLIENT->MAIN::save-config')).contents as string)
  expect(saved.strategies[0].treeUrl).toBe(draft.drafts['1'])
  expect(saved.drafts ?? {}).toEqual({})
})

test('Save as makes a new strategy and leaves the first as it was', async ({ overlay, fakeApp }) => {
  test.setTimeout(90_000)
  const atlas = await bootAtlas(overlay, await smallTreeLink())
  const points = atlas.getByText(/\d+ \/ \d+ points/)
  await expect(points).toBeVisible({ timeout: 30_000 })
  const canvas = atlas.locator('canvas').last()
  const box = (await canvas.boundingBox())!
  const tip = overlay.page.getByText(/^Click to take: \d+ points?/)
  let found = false
  for (let y = 0.2; y <= 0.8 && !found; y += 0.04) {
    for (let x = 0.3; x <= 0.8 && !found; x += 0.03) {
      await overlay.page.mouse.move(box.x + box.width * x, box.y + box.height * y)
      found = await tip.isVisible()
    }
  }
  expect(found).toBe(true)
  await overlay.page.mouse.down()
  await overlay.page.mouse.up()
  await atlas.getByTitle(/^Save as a new strategy/).click()
  await atlas.getByPlaceholder('New strategy name').fill('Breach threads v2')
  fakeApp.clearReceived()
  await atlas.getByPlaceholder('New strategy name').press('Enter')
  await expect(atlas.getByText('Breach threads v2').first()).toBeVisible()
  await overlay.page.evaluate(() => window.dispatchEvent(new Event('blur')))
  const saved = savedAtlas((await fakeApp.waitForReceived('CLIENT->MAIN::save-config')).contents as string)
  const first = saved.strategies.find((s: { id: number }) => s.id === 1)
  const copy = saved.strategies.find((s: { name: string }) => s.name === 'Breach threads v2')
  expect(copy.treeUrl).not.toBe(first.treeUrl)
  expect(copy.folder).toBe('Juicing')
  expect(saved.selectedId).toBe(copy.id)
  expect(saved.drafts ?? {}).toEqual({})
})

test('Threads, regexes in the library, and importing a guide', async ({ overlay, fakeApp }) => {
  test.setTimeout(90_000)
  const atlas = await bootAtlas(overlay, '')
  await expect(atlas.getByText('Threads per map')).toBeVisible()
  await atlas.getByRole('button', { name: /Add a Thread/ }).click()
  await expect(atlas.locator('select').filter({ hasText: 'Ritual' })).toHaveCount(2)

  // A regex lands in the Regex library under the strategy's folder.
  await atlas.getByTitle('Add a regex').click()
  await atlas.getByPlaceholder('Name, e.g. Map mods').fill('Map mods')
  await atlas.getByPlaceholder('"!ref|mana|ele"').fill('"!ref|mana"')
  fakeApp.clearReceived()
  await atlas.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(atlas.getByText('"!ref|mana"')).toBeVisible()
  const saved = JSON.parse((await fakeApp.waitForReceived('CLIENT->MAIN::save-config')).contents as string)
  const lib = saved.widgets.find((w: { wmType: string }) => w.wmType === 'woke-regex-library')
  expect(lib.entries.find((e: { text: string }) => e.text === '"!ref|mana"')?.category).toBe('Atlas strategies/Juicing/Breach threads')

  // Import guide text into a folder.
  await atlas.getByTitle('Import a tree link, guide text or strategy code').click()
  await atlas.locator('[data-import]').fill('Ritual farm\n6x Ritual Thread\n2x Chaos Orb')
  await atlas.locator('select').first().selectOption('Leaguestart')
  await atlas.getByRole('button', { name: 'Import', exact: true }).click()
  await expect(atlas.locator('[data-w-panel]').filter({ hasText: 'Threads per map' }).getByText('Ritual farm', { exact: true })).toBeVisible()
  await expect(atlas.locator('select').filter({ hasText: 'Ritual' }).first()).toHaveValue('Ritual')
  await overlay.snap('imported a guide into Leaguestart')
})

test('mechanics light up on the tree, and the tree pins over the game', async ({ overlay, fakeApp }) => {
  test.setTimeout(90_000)
  const atlas = await bootAtlas(overlay, await smallTreeLink())
  const breach = atlas.getByTitle(/^Breach: \d+ of/)
  await expect(breach).toBeVisible({ timeout: 30_000 })
  await breach.click()
  await atlas.getByTitle(/^Ritual: \d+ of/).click()
  await expect(breach).toHaveAttribute('aria-pressed', 'true')
  await overlay.page.waitForTimeout(1500)
  await overlay.snap('Breach and Ritual lit on the tree')
  fakeApp.clearReceived()
  await overlay.page.evaluate(() => window.dispatchEvent(new Event('blur')))
  const saved = savedAtlas((await fakeApp.waitForReceived('CLIENT->MAIN::save-config')).contents as string)
  expect(saved.lit).toEqual(['Breach', 'Ritual'])

  await atlas.getByTitle(/Pin the tree over the game/).click()
  const pin = overlay.page.locator('[data-pin^="atlas-tree:"]')
  await expect(pin).toBeVisible()
  await expect(pin.locator('canvas').first()).toBeVisible({ timeout: 15_000 })
  await overlay.snap('the tree pinned')
})

test('Tree totals in the loadout add up the taken passives, and fold', async ({ overlay }) => {
  test.setTimeout(90_000)
  const atlas = await bootAtlas(overlay, await smallTreeLink())
  await expect(atlas.getByText(/\d+ \/ \d+ points/)).toBeVisible({ timeout: 30_000 })
  const fold = atlas.getByRole('button', { name: /Tree totals/ })
  await expect(fold).toHaveAttribute('aria-expanded', 'true')
  // Something is taken, so there's at least one total.
  await expect(atlas.getByText('Nothing taken yet.')).toHaveCount(0)
  await overlay.page.waitForTimeout(1200)
  await overlay.snap('tree totals in the loadout')
  await fold.click()
  await expect(fold).toHaveAttribute('aria-expanded', 'false')
})

test('a notable with types opens its types to take it with one, and to change or refund it', async ({ overlay }) => {
  test.setTimeout(120_000)
  const atlas = await bootAtlas(overlay, await smallTreeLink())
  const points = atlas.getByText(/\d+ \/ \d+ points/)
  await expect(points).toBeVisible({ timeout: 30_000 })
  const before = Number((await points.textContent())!.trim().split(' ')[0])
  // Zoom out to the whole atlas, then find a notable with types by resting on the tree.
  const canvas = atlas.locator('canvas').last()
  const box = (await canvas.boundingBox())!
  await overlay.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  for (let i = 0; i < 14; i++) { await overlay.page.mouse.wheel(0, 300); await overlay.page.waitForTimeout(30) }
  const tip = overlay.page.getByText(/Click to pick a type: \d+ points?/)
  let found: { x: number, y: number } | null = null
  for (let y = 0.05; y <= 0.95 && !found; y += 0.02) {
    for (let x = 0.3; x <= 0.95 && !found; x += 0.015) {
      const at = { x: box.x + box.width * x, y: box.y + box.height * y }
      await overlay.page.mouse.move(at.x, at.y)
      if (await tip.isVisible()) found = at
    }
  }
  expect(found).not.toBeNull()
  const cost = Number((await tip.textContent())!.match(/(\d+) points?/)![1])
  await overlay.page.mouse.down()
  await overlay.page.mouse.up()
  const head = overlay.page.getByText(/: pick a type \(\d+ points?\)$/)
  await expect(head).toBeVisible()
  await overlay.snap('the types of a notable, to take it with one')
  await head.locator('xpath=following::button[2]').click()
  await expect(points).toContainText(`${before + cost} / `)
  // Clicking it again offers Refund.
  await overlay.page.mouse.move(found!.x + 1, found!.y)
  await overlay.page.mouse.move(found!.x, found!.y)
  await expect(overlay.page.getByText(/Type: .+\. Click to change or refund/)).toBeVisible()
  await overlay.page.mouse.down()
  await overlay.page.mouse.up()
  await overlay.page.getByRole('menuitem', { name: 'Refund' }).click()
  // The notable goes; the path to it stays, as with any refund.
  await expect(points).toContainText(`${before + cost - 1} / `)
})

test('the points slider steps back through the plan in the order it was taken', async ({ overlay, fakeApp }) => {
  test.setTimeout(90_000)
  const atlas = await bootAtlas(overlay, await smallTreeLink())
  const points = atlas.getByText(/\d+ \/ \d+ points/)
  await expect(points).toBeVisible({ timeout: 30_000 })
  const slider = atlas.getByRole('slider', { name: /Points taken/ })
  await slider.evaluate((el: HTMLInputElement) => { el.value = '2'; el.dispatchEvent(new Event('input', { bubbles: true })) })
  await expect(points).toContainText('2 of ')
  await overlay.page.waitForTimeout(800)
  await overlay.snap('the tree after 2 points, the rest faint')
  fakeApp.clearReceived()
  await overlay.page.evaluate(() => window.dispatchEvent(new Event('blur')))
  const saved = savedAtlas((await fakeApp.waitForReceived('CLIENT->MAIN::save-config')).contents as string)
  expect(saved.pointsAt).toEqual({ 1: 2 })
  // All the way up is the whole plan again.
  await slider.evaluate((el: HTMLInputElement) => { el.value = el.max; el.dispatchEvent(new Event('input', { bubbles: true })) })
  await expect(points).not.toContainText(' of ')
})

// Guy's list: an empty "3.30" folder with three loose strategies under it,
// which looked like its contents. Pick A: loose ones first, drag and drop,
// folders in your order, Alt + arrows, several at once, a sort menu.
test('the list: loose strategies first, drag and drop, Alt + arrows, several at once', async ({ overlay, fakeApp }) => {
  await overlay.boot({
    overlayActive: true,
    widgets: [{
      wmType: 'woke-atlas-strategies',
      wmTitle: 'Atlas strategies',
      wmWants: 'show',
      wmFlags: ['invisible-on-blur'],
      anchor: { pos: 'tl', x: 2, y: 8 },
      dataUrl: '',
      selectedId: null,
      treeHidden: true,
      folders: ['3.30', 'Juicing'],
      strategies: ['Start Shell', 'New strategy', 'Starter'].map((name, i) =>
        ({ id: i + 1, name, folder: '', league: '', tags: [], treeUrl: '', threads: [], scarabs: '', device: '', regex: '', notes: '' }))
    } as never]
  })
  const atlas = overlay.widget('woke-atlas-strategies')
  const rows = atlas.locator('[data-row]')
  const order = async () => (await rows.evaluateAll(els => els.map(e => (e as HTMLElement).dataset.row)))
  await expect(rows.first()).toBeVisible()
  expect(await order()).toEqual(['s:1', 's:2', 's:3', 'f:3.30', 'f:Juicing'])

  // Drag Start Shell into 3.30: it counts 1.
  const folder = atlas.locator('[data-row="f:3.30"]')
  await atlas.locator('[data-row="s:1"]').dragTo(folder, { targetPosition: { x: 40, y: 18 } })
  await expect(folder).toContainText('1')
  expect(await order()).toEqual(['s:2', 's:3', 'f:3.30', 's:1', 'f:Juicing'])
  if (process.env.WOKE_SNAP_DIR) await overlay.page.screenshot({ path: `${process.env.WOKE_SNAP_DIR}/atlas-dnd-after-drop.png`, clip: { x: 0, y: 0, width: 520, height: 420 } })

  // Juicing above 3.30: dropped on the top part of the 3.30 row.
  await atlas.locator('[data-row="f:Juicing"]').dragTo(folder, { targetPosition: { x: 40, y: 2 } })
  expect(await order()).toEqual(['s:2', 's:3', 'f:Juicing', 'f:3.30', 's:1'])

  // Alt + Up takes Start Shell out of its folder (it lands above the folders).
  await atlas.locator('[data-row="s:1"] button').first().focus()
  await overlay.page.keyboard.press('Alt+ArrowUp')
  expect(await order()).toEqual(['s:2', 's:3', 's:1', 'f:Juicing', 'f:3.30'])
  await overlay.page.keyboard.press('Alt+ArrowUp')
  expect(await order()).toEqual(['s:2', 's:1', 's:3', 'f:Juicing', 'f:3.30'])

  // Ctrl + click two, drag both into Juicing.
  await atlas.locator('[data-row="s:2"] button').first().click()
  await atlas.locator('[data-row="s:3"] button').first().click({ modifiers: ['Control'] })
  await atlas.locator('[data-row="s:3"]').dragTo(atlas.locator('[data-row="f:Juicing"]'), { targetPosition: { x: 40, y: 18 } })
  expect(await order()).toEqual(['s:1', 'f:Juicing', 's:2', 's:3', 'f:3.30'])

  // The sort menu: Name puts folders and strategies A to Z.
  await atlas.getByTitle('Sort: My order').click()
  await overlay.page.getByRole('menuitem', { name: 'Name' }).click()
  expect(await order()).toEqual(['s:1', 'f:3.30', 'f:Juicing', 's:2', 's:3'])

  fakeApp.clearReceived()
  await overlay.page.evaluate(() => window.dispatchEvent(new Event('blur')))
  const saved = savedAtlas((await fakeApp.waitForReceived('CLIENT->MAIN::save-config')).contents as string)
  expect(saved.strategies.map((s: { name: string, folder: string }) => `${s.folder}:${s.name}`))
    .toEqual([':Start Shell', 'Juicing:New strategy', 'Juicing:Starter'])
  expect(saved.folderOrder).toEqual(['Juicing', '3.30'])
  expect(saved.sortBy).toBe('name')
})
