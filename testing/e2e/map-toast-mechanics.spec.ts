// The after-map toast's mechanic chips carry the mechanic's game icon (Guy 2026-11-25).
import { test, expect } from './harness'

const t = (m: number, s: number) => `2026/11/05 15:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
// A map with Delirium (its voice) and Einhar, then back to the hideout.
const run = (m: number, seed: number) => [
  `${t(m, 0)} 3725546 1186a8a3 [DEBUG Client 25552] Generating level 83 area "MapWorldsStrand" with seed ${seed}`,
  `${t(m, 1)} 3727812 cffb065b [INFO Client 25552] : You have entered Strand.`,
  `${t(m, 10)} 3727812 cffb065b [INFO Client 25552] Strange Voice: So be it.`,
  `${t(m, 20)} 3727812 cffb065b [INFO Client 25552] Einhar, Beastmaster: Haha! You are ready to bring the beast!`,
  `${t(m, 50)} 3725546 1186a8a3 [DEBUG Client 25552] Generating level 60 area "HideoutArenaSearingExarch" with seed 1`,
  `${t(m, 51)} 3727812 cffb065b [INFO Client 25552] : You have entered Searing Hideout.`
]

test('the after-map toast shows each mechanic with its icon', async ({ overlay }) => {
  await overlay.boot({
    overlayActive: true,
    patch: c => {
      const w = c.widgets.find((w: { wmType: string }) => w.wmType === 'woke-session-story')
      w.chipPlace = 'center'
      w.chipSeconds = 0
    }
  })
  await overlay.log([
    `${t(0, 34)} 3725546 1186a8a3 [DEBUG Client 25552] Generating level 60 area "HideoutArenaSearingExarch" with seed 1`,
    `${t(0, 35)} 3727812 cffb065b [INFO Client 25552] : You have entered Searing Hideout.`
  ])
  // The widget follows the log only once its saved maps load: each try runs one more map
  // until a leave is read live (as in map-toast-resize.spec.ts).
  const toast = overlay.page.locator('[data-map-toast]')
  for (let i = 0; i < 5 && !(await toast.isVisible()); i++) {
    await overlay.log(run(1 + i * 2, 7 + i))
    await toast.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
  }
  await expect(toast).toBeVisible({ timeout: 5000 })
  for (const name of ['Delirium', 'Einhar']) {
    const chip = toast.locator(`[data-map-toast-chip="${name}"]`)
    await expect(chip).toHaveText(name)
    // Its art, or the icon's fallback glyph where the art can't load.
    await expect(chip.locator('img.w-game-icon, i')).toHaveCount(1)
  }
  await overlay.snap('map toast mechanic chips')
})
