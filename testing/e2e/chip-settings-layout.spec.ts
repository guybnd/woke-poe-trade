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

  expect(await misfits(settings, '[data-w-popup]')).toEqual([])
  // Every look: the options wrap as buttons of their own.
  const card = settings.locator('xpath=ancestor::*[@data-w-popup][1]')
  await card.screenshot({ path: test.info().outputPath('card-art.png') })
  for (const [look, art] of [['game', false], ['plain', false]] as const) {
    await overlay.page.evaluate(([look, art]) => {
      document.documentElement.setAttribute('data-woke-look', look)
      if (!art) document.documentElement.removeAttribute('data-woke-art')
    }, [look, art] as const)
    expect(await misfits(settings, '[data-w-popup]')).toEqual([])
    await card.screenshot({ path: test.info().outputPath(`card-${look}.png`) })
  }
})

test('Settings › Sessions lays the same settings out the same way', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({
    patch: (c: { widgets: Array<{ wmType: string, glance?: boolean }> }) => {
      c.widgets.find(w => w.wmType === 'woke-session-story')!.glance = false
    }
  })
  await overlay.pressHotkey('Ctrl + Space')
  const panel = overlay.widget('woke-search')
  await panel.getByRole('textbox', { name: 'Search', exact: true }).fill('sessions')
  await panel.getByRole('button', { name: /\sSessions\s*Settings page$/ }).dblclick()
  const settings = overlay.widget('settings').locator('[data-chip-settings]')
  await expect(settings).toBeVisible()
  expect(await misfits(settings, '[data-chip-settings]')).toEqual([])
  // The glance bar's toggle sits as close under its label as every control.
  const gaps = await settings.evaluate((root) => [...root.children].map((el, i, all) => {
    const prev = all[i - 1]
    return prev?.classList.contains('w-dim') ? Math.round(el.getBoundingClientRect().top - prev.getBoundingClientRect().bottom) : null
  }).filter((g): g is number => g != null))
  expect(new Set(gaps).size).toBe(1)
  await settings.screenshot({ path: test.info().outputPath('settings.png') })
})

// What runs past the container's right edge, and labels that wrap.
async function misfits (settings: import('@playwright/test').Locator, container: string) {
  return settings.evaluate((root, container) => {
    const edge = root.closest(container)!.getBoundingClientRect().right + 0.5
    const out: string[] = []
    for (const el of [root, ...root.querySelectorAll<HTMLElement>('button, select, span, div')]) {
      const r = el.getBoundingClientRect()
      if (r.width && r.right > edge) out.push(`off the edge: ${el.textContent!.trim().slice(0, 30)}`)
    }
    for (const el of root.querySelectorAll<HTMLElement>(':scope > .w-dim')) {
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 20
      if (el.getBoundingClientRect().height > lh * 1.5) out.push(`label wraps: ${el.textContent!.trim()}`)
    }
    return out
  }, container)
}
