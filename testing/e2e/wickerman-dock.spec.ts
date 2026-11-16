// The Wickerman dock icon: in every map, naming the Viscera its boss drops,
// or saying none is known for a map the drop list doesn't name.
import { test, expect } from './harness'

const area = (id: string, level: number) => `2026/11/16 13:00:00 1 abc [DEBUG Client 1] Generating level ${level} area "${id}" with seed 1`
const info = (text: string) => `2026/11/16 13:00:01 1 abc [INFO Client 1] ${text}`

test('the Wickerman icon shows in every map, with its Viscera or none known', async ({ overlay }) => {
  await overlay.boot()
  // A map the drop list names: Tropical Island's boss drops Primate Foot.
  await overlay.log([area('MapWorldsTropicalIsland', 83), info(': You have entered Tropical Island.')])
  await expect(overlay.dockIcon('wickerman')).toBeVisible({ timeout: 15_000 })
  await overlay.hoverDockIcon('wickerman')
  const card = overlay.page.locator('[data-woke-wickerman-card]')
  await expect(card).toContainText('Primate Foot')
  await overlay.moveMouse(1800, 900)

  // A map it doesn't name: the icon stays, and says so.
  await overlay.log([area('MapWorldsScriptorium', 83), info(': You have entered Scriptorium.')])
  await expect(overlay.dockIcon('wickerman')).toBeVisible()
  await overlay.hoverDockIcon('wickerman')
  await expect(card).toContainText("No known Viscera from this map's boss")
  await overlay.snap('none known')

  // Not in town.
  await overlay.moveMouse(1800, 900)
  await overlay.log([area('HideoutFelled', 1), info(': You have entered Felled Hideout.')])
  await expect(overlay.dockIcon('wickerman')).toHaveCount(0)
  expect(overlay.errors).toEqual([])
})
