// A cluster jewel's title picks another size and type to search (WOKEPOET-366).
// Picking never searches; Search does, once.
import { test, expect, fixtureText } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }

for (const style of ['rows', 'poe'] as const) {
test(`a cluster jewel title picks a size and type, typed or clicked, and only Search searches (${style})`, async ({ overlay }) => {
  const searches: string[] = []
  await overlay.page.route('**/api/trade/search/**', (route) => {
    searches.push(route.request().postData() ?? '')
    return route.fulfill({ contentType: 'application/json', headers: LIMITS, body: JSON.stringify({ id: 'q', total: 0, result: [] }) })
  })
  await overlay.boot({
    patch: (config: any) => { config.widgets.find((w: { wmType: string }) => w.wmType === 'price-check').wokeWindowStyle = style }
  })
  await overlay.copyItem(fixtureText('items/rare-cluster-large.txt'))
  const panel = overlay.widget('price-check')
  const title = panel.locator('[data-cluster-type] > button')
  await expect(title).toHaveText(/Large Cluster Jewel · Fire Damage/)
  await expect(panel.locator('[data-cluster-scope]')).toHaveText('This size')
  await overlay.page.waitForTimeout(300)
  const before = searches.length

  // Open: the copied size's tab, its types, the copied one marked.
  await title.click()
  const drop = panel.locator('.w-ctp-drop')
  await expect(drop.getByRole('tab', { name: 'Large', selected: true })).toBeVisible()
  await expect(drop.getByRole('option')).toHaveCount(17)
  await expect(drop.getByRole('option', { name: /Fire Damage/ })).toContainText('yours')
  await overlay.snap(`cluster-type-open-${style}`)

  // Typing filters; a word only another size has moves to that size.
  await overlay.page.keyboard.type('crit')
  await expect(drop.getByRole('tab', { name: /Medium/, selected: true })).toBeVisible()
  await expect(drop.getByRole('option')).toHaveCount(1)
  await overlay.page.keyboard.press('Enter')
  await expect(drop).toHaveCount(0)
  await expect(title).toHaveText(/Medium Cluster Jewel · Critical Chance/)
  // The passive count follows the size: its line and both boxes.
  await expect(panel.getByText('Adds 4-6 Passive Skills')).toBeVisible()
  await overlay.page.waitForTimeout(300)
  expect(searches.length).toBe(before)

  // Search runs the picked jewel.
  await panel.getByRole('button', { name: 'Search', exact: true }).first().click()
  await expect.poll(() => searches.length).toBe(before + 1)
  const body = JSON.parse(searches[searches.length - 1])
  expect(body.query.type).toBe('Medium Cluster Jewel')
  const ids = body.query.stats.flatMap((g: { filters: Array<{ id: string, disabled?: boolean }> }) => g.filters.filter(f => !f.disabled).map(f => f.id))
  expect(ids).toContain('enchant.stat_3948993189|29')
  const counts = body.query.stats.flatMap((g: { filters: Array<{ value?: { min?: number, max?: number } }> }) => g.filters.map(f => f.value))
  expect(counts).toContainEqual(expect.objectContaining({ min: 4, max: 6 }))
  expect(ids.some((id: string) => id.includes('|') && id !== 'enchant.stat_3948993189|29')).toBe(false)
  await overlay.snap(`cluster-type-picked-${style}`)

  // A click on a Large type goes back to that size.
  await title.click()
  await drop.getByRole('tab', { name: 'Large' }).click()
  await drop.getByRole('option', { name: /^Spell Damage/ }).click()
  await expect(title).toHaveText(/Large Cluster Jewel · Spell Damage/)
  // Clicking the title again closes it; none of this searched.
  await title.click()
  await expect(drop).toHaveCount(1)
  await title.click()
  await expect(drop).toHaveCount(0)
  await overlay.page.waitForTimeout(300)
  expect(searches.length).toBe(before + 1)
})
}

const DUAL = `Item Class: Jewels
Rarity: Rare
Grim Spark
Large Cluster Jewel
--------
Requirements:
Level: 54
--------
Item Level: 84
--------
Adds 8 Passive Skills (enchant)
2 Added Passive Skills are Jewel Sockets (enchant)
Added Small Passive Skills grant: 12% increased Attack Damage while Dual Wielding (enchant)
--------
{ Prefix Modifier "Insatiable Killer" (Tier: 1) }
1 Added Passive Skill is Insatiable Killer
{ Prefix Modifier "Combat Rhythm" (Tier: 1) }
1 Added Passive Skill is Combat Rhythm
{ Suffix Modifier "Heavy Hitter" (Tier: 1) }
1 Added Passive Skill is Heavy Hitter
--------
Place into an allocated Large Jewel Socket on the Passive Skill Tree. Added passives do not interact with jewel radiuses. Right click to remove from the Socket.`

for (const style of ['rows', 'poe'] as const) {
  test(`each notable says where it sits on the jewel, front first (${style})`, async ({ overlay }) => {
    await overlay.boot({
      patch: (config: any) => { config.widgets.find((w: { wmType: string }) => w.wmType === 'price-check').wokeWindowStyle = style }
    })
    await overlay.copyItem(DUAL)
    const panel = overlay.widget('price-check')
    const tags = panel.locator('[data-cluster-spot]')
    await expect(tags).toHaveText(['front · 2 pts', 'front · 2 pts', 'back · 5 pts'])
    await expect(panel.getByText('Insatiable Killer').last()).toBeVisible()
    await overlay.snap(`cluster-spots-${style}`)
  })
}
