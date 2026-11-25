// Session story's glance bar fields (Settings › Sessions › On the bar) and
// "Bar shows": deaths and mechanics in a map, and out of maps the map you just
// left, only when the bar is set to stay up.
import { test, expect } from './harness'

// Each test plays its map from now on, later than the test before it (and
// any spec run earlier in this worker). The app keeps the maps and night they
// saved: the session widget reads the log's tail when it starts (under load,
// after the test's lines are written), skips lines older than the last saved
// map, and ends a night quiet for 15 minutes. Fixed old times made the
// "In maps" test lose its map about one run in three.
let nextStart = 0
function clock () {
  const start = Math.max(nextStart, Date.now() - 20_000)
  nextStart = start + 200_000
  const pad = (n: number) => String(n).padStart(2, '0')
  // Seconds into the test's map run, as Client.txt writes the time (local).
  return (sec: number) => {
    const d = new Date(start + sec * 1000)
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
}
const t = (time: string) => `${time} 3725546 1186a8a3`
const lines = {
  hideout: (time: string) => [
    `${t(time)} [DEBUG Client 25552] Generating level 60 area "HideoutArenaSearingExarch" with seed 1`,
    `${t(time)} [INFO Client 25552] : You have entered Searing Hideout.`
  ],
  strand: (time: string) => [
    `${t(time)} [DEBUG Client 25552] Generating level 83 area "MapWorldsStrand" with seed 7`,
    `${t(time)} [INFO Client 25552] : You have entered Strand.`
  ],
  slain: (time: string) => [`${t(time)} [INFO Client 25552] : whekq has been slain.`],
  einhar: (time: string) => [`${t(time)} [INFO Client 25552] Einhar, Beastmaster: Hello there.`]
}

function glance (fields: string[], show: string) {
  return (c: { widgets: Array<{ wmType: string, glance?: boolean, glanceFields?: string[], glanceShow?: string, glancePos?: unknown }> }) => {
    const w = c.widgets.find(w => w.wmType === 'woke-session-story')!
    w.glance = true
    w.glanceFields = fields
    w.glanceShow = show
    w.glancePos = { x: 0.5, y: 0.3 }
  }
}

test('deaths and mechanics show in a map, and the last map stays up out of maps', async ({ overlay }) => {
  const at = clock()
  await overlay.boot({ patch: glance(['map', 'time', 'deaths', 'mechanics', 'maps', 'last'], 'game') })
  await overlay.log([...lines.hideout(at(0)), ...lines.strand(at(26))])
  const bar = overlay.page.locator('[data-glance-bar]')
  await expect(bar).toBeVisible({ timeout: 15_000 })
  await expect(bar.locator('[data-glance-map]')).toHaveText('Strand')
  await expect(bar.locator('[data-glance-deaths]')).toBeHidden()

  await overlay.log([...lines.einhar(at(46)), ...lines.slain(at(66))])
  await expect(bar.locator('[data-glance-deaths]')).toHaveText('1')
  await expect(bar.locator('[data-glance-mechanics]')).toHaveText('Einhar')
  await overlay.snap('glance-bar-fields-in-map')

  // Out to the hideout: "All the time in game" keeps it, with the map you left.
  await overlay.log(lines.hideout(at(147)))
  await expect(bar.locator('[data-glance-last]')).toHaveText('Strand')
  await expect(bar).toContainText('2:01')
  await expect(bar.locator('[data-glance-map]')).toBeHidden()
  await overlay.snap('glance-bar-fields-last-map')
})

test('set to In maps, it goes when you leave the map, and ticked-off fields stay off', async ({ overlay }) => {
  const at = clock()
  await overlay.boot({ patch: glance(['time'], 'map') })
  await overlay.log([...lines.hideout(at(0)), ...lines.strand(at(26))])
  const bar = overlay.page.locator('[data-glance-bar]')
  await expect(bar).toBeVisible({ timeout: 15_000 })
  await expect(bar.locator('[data-glance-time]')).toBeVisible()
  await expect(bar.locator('[data-glance-map]')).toBeHidden()
  await expect(bar.locator('[data-glance-session]')).toBeHidden()

  await overlay.log(lines.hideout(at(147)))
  await expect(bar).toBeHidden()
})

test('with the overlay open, the cog opens the bar settings under it, saved as you tick', async ({ overlay, fakeApp }) => {
  const at = clock()
  await overlay.boot({ patch: glance(['time'], 'map') })
  await overlay.log([...lines.hideout(at(0)), ...lines.strand(at(26))])
  const bar = overlay.page.locator('[data-glance-bar]')
  await expect(bar).toBeVisible({ timeout: 15_000 })
  // While you play: no cog (it would take the mouse).
  await expect(bar.locator('[data-glance-cog]')).toHaveCount(0)

  await overlay.pressHotkey(overlay.config.overlayKey)
  await bar.locator('[data-glance-cog]').click()
  const pop = bar.locator('[data-glance-popover]')
  await expect(pop).toBeVisible()
  await expect(bar.locator('[data-glance-map]')).toHaveCount(0)
  await pop.getByRole('switch', { name: 'Map and tier' }).click()
  await expect(bar.locator('[data-glance-map]')).toHaveText('Strand')
  await expect.poll(() => overlay.savedWidget('woke-session-story')?.glanceFields ?? null).toEqual(['map', 'time'])
  await pop.getByRole('switch', { name: 'Map and tier' }).click()
  await expect.poll(() => overlay.savedWidget('woke-session-story')?.glanceFields ?? null).toEqual(['time'])
  await overlay.snap('glance-bar-cog-popover')

  // Back to the game: the popover closes, and the cog goes.
  fakeApp.focusGame(true)
  await expect(bar.locator('[data-glance-cog]')).toHaveCount(0)
  await expect(pop).toHaveCount(0)
})
