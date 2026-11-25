// The dock card's "After a map" settings fit the card: each label on one line
// above its control, and no option runs off the card's right edge.
import { test, expect } from './harness'

const SLOW = { timeout: 15_000 }
const t = (time: string) => `2026/11/05 ${time} 3725546 1186a8a3`
const lines = [
  `${t('15:00:34')} [DEBUG Client 25552] Generating level 60 area "HideoutArenaSearingExarch" with seed 1`,
  `${t('15:00:34')} [INFO Client 25552] : You have entered Searing Hideout.`,
  `${t('15:01:00')} [DEBUG Client 25552] Generating level 83 area "MapWorldsStrand" with seed 7`,
  `${t('15:01:00')} [INFO Client 25552] : You have entered Strand.`,
  `${t('15:04:00')} [DEBUG Client 25552] Generating level 60 area "HideoutArenaSearingExarch" with seed 1`,
  `${t('15:04:00')} [INFO Client 25552] : You have entered Searing Hideout.`
]

test('the dock card\'s After a map settings fit the card', async ({ overlay }) => {
  await overlay.boot({
    patch: (c: { widgets: Array<{ wmType: string, glance?: boolean, chipPlace?: string }> }) => {
      const w = c.widgets.find(w => w.wmType === 'woke-session-story')!
      w.glance = true
      w.chipPlace = 'center'
    }
  })
  await overlay.log(lines)
  await expect(overlay.dockIcon('session-story')).toBeVisible(SLOW)
  const gear = overlay.page.locator('[data-chip-gear-card]')
  await expect(async () => {
    await overlay.hoverDockIcon('session-story')
    await expect(gear).toBeVisible({ timeout: 1500 })
  }).toPass(SLOW)
  await gear.click()
  const settings = overlay.page.locator('[data-chip-settings]')
  await expect(settings).toBeVisible()
  await expect(settings.locator('[data-glance-fields]')).toBeVisible()

  const bad = await settings.evaluate((root) => {
    const edge = root.getBoundingClientRect().right + 0.5
    const out: string[] = []
    for (const el of root.querySelectorAll<HTMLElement>('button, select, span, div')) {
      const r = el.getBoundingClientRect()
      if (r.width && r.right > edge) out.push(`off the edge: ${el.textContent!.trim().slice(0, 30)}`)
    }
    for (const el of root.querySelectorAll<HTMLElement>(':scope > .w-dim')) {
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 20
      if (el.getBoundingClientRect().height > lh * 1.5) out.push(`label wraps: ${el.textContent!.trim()}`)
    }
    return out
  })
  expect(bad).toEqual([])
  await settings.locator('xpath=../..').screenshot({ path: test.info().outputPath('chip-settings.png') })
})
