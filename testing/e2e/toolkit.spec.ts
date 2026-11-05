// The toolkit as a whole: every module's widget mounts in the overlay, the
// module switchboard really switches things off, first-run setup, and the
// hide-all hotkey.
import { test, expect } from './harness'
import { MODULES } from './woke-modules'

const WIDGET_TYPES = MODULES.flatMap(m => m.widgetTypes)

test('every module\'s widget mounts and shows without errors', async ({ overlay }) => {
  await overlay.boot({
    widgets: WIDGET_TYPES.map(wmType => ({ wmType, wmWants: 'show' as const })),
    overlayActive: true
  })
  for (const wmType of WIDGET_TYPES) {
    await expect(overlay.widget(wmType), wmType).toBeAttached()
    // Dock icon until opened: mechanics in a league mechanic zone, the campaign
    // tracker during the campaign (its panel went in #117).
    if (wmType === 'woke-mechanics' || wmType === 'woke-campaign') continue
    // Each panel draws something (not an empty shell).
    await expect.poll(async () => (await overlay.widget(wmType).innerText()).trim().length, { message: wmType }).toBeGreaterThan(0)
  }
  await overlay.snap('every widget at once')
  // The harness fails the test on any page error after this.
})

test('a module switched off: no widget, no hotkeys', async ({ overlay, fakeApp }) => {
  await overlay.boot({
    widgets: [{ wmType: 'woke-map-scan' }, { wmType: 'woke-essence-scan' }],
    off: ['map-scan', 'apt-price-check']
  })
  await expect(overlay.widget('woke-essence-scan')).toBeAttached()
  await expect(overlay.widget('woke-map-scan')).not.toBeAttached()
  await expect.poll(() => fakeApp.registeredHotkeys()).toContain('Alt+E')
  const keys = fakeApp.registeredHotkeys()
  expect(keys).not.toContain('Alt+S') // map scan
  expect(keys).not.toContain('Alt+R') // map scan rolling
  // Price check (an APT feature) switched off: both of its keys.
  expect(keys).not.toContain('Ctrl+D')
  expect(keys).not.toContain('Ctrl+Alt+D')
})

test('first run: the setup window picks tools; the overlay shows no second picker', async ({ overlay, fakeApp }) => {
  await overlay.boot({ firstRun: true, overlayActive: true })
  const page = overlay.page
  await expect(page.getByText('Set up your toolkit')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Choose tools' })).toHaveCount(0)
  // The setup window is the same page with #setup.
  await page.goto(`${fakeApp.url}#setup`)
  await page.reload()
  await page.getByRole('button', { name: /Tools/ }).click()
  await page.getByRole('radio', { name: 'Leveling' }).click()
  await overlay.snap('setup window, Leveling picked')
  await page.getByRole('button', { name: 'Next' }).click()
  await expect.poll(() => fakeApp.readConfig()?.woke?.off ?? []).toContain('map-scan')
  const off: string[] = fakeApp.readConfig().woke.off
  expect(off).toContain('market')
  expect(off).not.toContain('campaign')
  expect(off).not.toContain('run-timer')
})

test('hide-all hotkey hides the toolkit (dock included) and brings it back', async ({ overlay }) => {
  await overlay.boot({
    widgets: [{ wmType: 'woke-campaign' }],
    patch: c => { c.woke.hideAllHotkey = 'Alt + H' }
  })
  // In a campaign zone the dock shows the campaign icon.
  await overlay.replayLog('client-logs/campaign-act1.txt')
  const icon = overlay.dockIcon('campaign')
  await expect(icon).toBeVisible()
  await overlay.pressHotkey('Alt + H')
  await expect(icon).toBeHidden()
  await expect(overlay.page.getByText('Toolkit panels hidden')).toBeVisible()
  await overlay.pressHotkey('Alt + H')
  await expect(icon).toBeVisible()
})
