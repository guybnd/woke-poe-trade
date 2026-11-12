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
  await overlay.page.evaluate(() => window.dispatchEvent(new Event('blur')))
  const saved = savedAtlas((await fakeApp.waitForReceived('CLIENT->MAIN::save-config')).contents as string)
  expect(saved.strategies[0].treeUrl).toMatch(/fullscreen-atlas-skill-tree\//)

  // Undo puts it back.
  await atlas.getByTitle('Undo (Ctrl + Z)').click()
  await expect(points).toContainText(`${before} / `)
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
