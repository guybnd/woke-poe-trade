// Session analytics' Map history: maps under a day header with their time,
// the range named in the summary, and each row's map tooltip on hover.
import { test, expect } from './harness'

// Today's date in the log's format, minutes before now, so the 7 days range has it.
function stamp (minutesAgo: number): string {
  const d = new Date(Date.now() - minutesAgo * 60_000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
const area = (ago: number, level: number, id: string, seed: number) =>
  `${stamp(ago)} 3725546 1186a8a3 [DEBUG Client 25552] Generating level ${level} area "${id}" with seed ${seed}`
const entered = (ago: number, name: string) => `${stamp(ago)} 3727812 cffb065b [INFO Client 25552] : You have entered ${name}.`

test('map history groups maps by day, names its range and shows the map on hover', async ({ overlay }) => {
  // Only minutes apart; a test started just after midnight would split them over two days.
  test.skip(new Date().getHours() === 0 && new Date().getMinutes() < 20, 'too close to midnight')
  await overlay.boot({
    widgets: [{ wmType: 'woke-session-analytics', wmWants: 'show' as const }],
    overlayActive: true
  })
  await overlay.log([
    area(12, 60, 'HideoutArenaSearingExarch', 1), entered(12, 'Searing Hideout'),
    area(11, 83, 'MapWorldsStrand', 7), entered(11, 'Strand'),
    area(8, 60, 'HideoutArenaSearingExarch', 1), entered(8, 'Searing Hideout'),
    // The next map saves the one before.
    area(7, 83, 'MapWorldsStrand', 8), entered(7, 'Strand'),
    area(4, 60, 'HideoutArenaSearingExarch', 1), entered(4, 'Searing Hideout')
  ])
  const panel = overlay.widget('woke-session-analytics')
  await panel.getByRole('tab', { name: 'Map history' }).click()
  const row = panel.locator('[data-map-row]').first()
  await expect(row).toBeVisible({ timeout: 10_000 })
  // The time of day, not a date cut short.
  await expect(row).toContainText(/^\d\d:\d\d/)
  await expect(row).toContainText('Strand')
  await expect(panel.locator('[data-history-day]').first()).toContainText('Today')
  await expect(panel.locator('[data-history-summary]')).toContainText(/1 map (this league|in 7 days)/)
  // The session card says when it began.
  await expect(panel.locator('[data-night-span]')).toContainText(/since|→/)

  await row.hover()
  const tip = overlay.page.getByRole('tooltip')
  await expect(tip).toContainText('Strand Map')
  await expect(tip).toContainText('in the map')
  await overlay.snap('map history')

  // A day folds to its header and opens again.
  const day = panel.locator('[data-history-day]').first()
  await day.click()
  await expect(panel.locator('[data-map-row]')).toHaveCount(0)
  await day.click()
  await expect(panel.locator('[data-map-row]')).toHaveCount(1)
  // Filters sit behind one button.
  await panel.locator('[data-history-filter]').click()
  await expect(overlay.page.getByRole('menu')).toContainText('All maps')
})
