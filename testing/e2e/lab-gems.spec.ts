// Lab gems: the Skip thin chip takes thin-market gems out of the lists and EVs.
import fs from 'fs'
import { fileURLToPath } from 'url'
import { test, expect } from './harness'

const DENSE = fileURLToPath(new URL('../fixtures/http/poe.ninja/poe1/api/economy/current/dense/overviews.json', import.meta.url))
const FULL = [0, 0, 0, 0, 0, 0, 0]
const THIN = [0, null, null, null, 0, 0, 0]
const line = (name: string, chaos: number, graph: Array<number | null>) => ({ name, variant: '20/20', chaos, graph })
const GEMS = JSON.stringify({
  type: 'SkillGem',
  lines: [
    line('Dominating Blow of Inspiring', 99000, THIN),
    line('Summon Stone Golem of Safeguarding', 88000, FULL),
    // A thin base gem has to keep its price: unknown bases count as free.
    line('Summon Stone Golem', 500, THIN)
  ]
})

test('Lab gems: Skip thin takes thin gems out of the list, EV and specific picks', async ({ overlay }) => {
  const recorded = fs.readFileSync(DENSE, 'utf8')
  await overlay.page.route('**/dense/overviews*', (route) => route.fulfill({
    contentType: 'application/json',
    body: recorded.replace(/\[\s*\{"type":"/, () => `[${GEMS},{"type":"`)
  }))
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-lab-gems', wmTitle: 'Lab gems', wmFlags: ['uninitialized'], anchor: { pos: 'tl', x: 40, y: 30 } }] })
  const w = overlay.widget('woke-lab-gems')
  const redPool = w.getByText('Red pool').locator('..')
  const redEv = redPool.locator('span.w-num')

  await expect(w).toContainText('Dominating Blow of Inspiring', { timeout: 15000 })
  await expect(redPool).toContainText('each')
  const evBefore = await redEv.innerText()
  await overlay.snap('lab gems, thin gems counted')

  await w.getByText('Skip thin').click()
  await expect(w).not.toContainText('Dominating Blow of Inspiring')
  await expect(w).toContainText('Summon Stone Golem of Safeguarding')
  await expect(redPool).toContainText('1 thin left out')
  await expect(w.locator('i[aria-label*="Unpriced and thin gems count as 0"]')).toHaveCount(1)
  expect(await redEv.innerText()).not.toEqual(evBefore)
  await overlay.snap('lab gems, thin gems skipped')

  // Specific gem: a thin variant gives no value, and a thin base still costs.
  await w.getByText('Specific gem').click()
  const golem = w.getByRole('button', { name: /^.*Summon Stone Golem/ })
  await expect(golem).toBeVisible()
  await expect(golem).not.toContainText('?')
  await expect(w.getByText('Dominating Blow', { exact: false })).toHaveCount(0)
  await golem.click()
  await expect(w).toContainText('Summon Stone Golem of Safeguarding')
  await overlay.snap('lab gems, specific tab with thin gems skipped')

  // Off again, everything is back.
  await w.getByText('Skip thin').click()
  await expect(w).toContainText('Dominating Blow')
})
