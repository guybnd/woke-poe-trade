// Session story's glance bar fields (Settings › Sessions › On the bar) and
// "Bar shows": deaths and mechanics in a map, and out of maps the map you just
// left, only when the bar is set to stay up.
import { test, expect } from './harness'

const t = (time: string) => `2026/11/05 ${time} 3725546 1186a8a3`
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
  await overlay.boot({ patch: glance(['map', 'time', 'deaths', 'mechanics', 'maps', 'last'], 'game') })
  await overlay.log([...lines.hideout('15:00:34'), ...lines.strand('15:01:00')])
  const bar = overlay.page.locator('[data-glance-bar]')
  await expect(bar).toBeVisible({ timeout: 15_000 })
  await expect(bar.locator('[data-glance-map]')).toHaveText('Strand')
  await expect(bar.locator('[data-glance-deaths]')).toBeHidden()

  await overlay.log([...lines.einhar('15:01:20'), ...lines.slain('15:01:40')])
  await expect(bar.locator('[data-glance-deaths]')).toHaveText('1')
  await expect(bar.locator('[data-glance-mechanics]')).toHaveText('Einhar')
  await overlay.snap('glance-bar-fields-in-map')

  // Out to the hideout: "All the time in game" keeps it, with the map you left.
  await overlay.log(lines.hideout('15:03:01'))
  await expect(bar.locator('[data-glance-last]')).toHaveText('Strand')
  await expect(bar).toContainText('2:01')
  await expect(bar.locator('[data-glance-map]')).toBeHidden()
  await overlay.snap('glance-bar-fields-last-map')
})

test('set to In maps, it goes when you leave the map, and ticked-off fields stay off', async ({ overlay }) => {
  await overlay.boot({ patch: glance(['time'], 'map') })
  await overlay.log([...lines.hideout('15:00:34'), ...lines.strand('15:01:00')])
  const bar = overlay.page.locator('[data-glance-bar]')
  await expect(bar).toBeVisible({ timeout: 15_000 })
  await expect(bar.locator('[data-glance-time]')).toBeVisible()
  await expect(bar.locator('[data-glance-map]')).toBeHidden()
  await expect(bar).not.toContainText('Tonight')

  await overlay.log(lines.hideout('15:03:01'))
  await expect(bar).toBeHidden()
})
