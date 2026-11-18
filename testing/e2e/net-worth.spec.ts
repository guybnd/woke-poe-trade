// Net worth from start to finish: the stash reader unlocked and turned on in
// Settings, signed in to a fake pathofexile.com, tabs picked, a read, and what
// the stash is worth. Main reads the site itself (stubs/electron.ts `site`).
import fs from 'fs'
import path from 'path'
import { test, expect, FIXTURES } from './harness'

const LIST = fs.readFileSync(path.join(FIXTURES, 'stash/tab-list.json'), 'utf8')
const DUMP = fs.readFileSync(path.join(FIXTURES, 'stash/tab-dump.json'), 'utf8')

test('the stash reader turns on, reads the picked tabs, and Net worth prices them', async ({ overlay, fakeApp }) => {
  fakeApp.site.reply = (url) => {
    const u = new URL(url)
    if (u.pathname === '/my-account') return { status: 200, body: '<html><title>View Profile - Path of Exile - Tester#1234</title></html>' }
    if (u.pathname === '/character-window/get-stash-items') return { status: 200, body: u.searchParams.get('tabIndex') === '0' ? LIST : DUMP }
    return null
  }
  try {
    await overlay.page.setViewportSize({ width: 2560, height: 1440 })
    await overlay.boot({ overlayActive: true })
    await overlay.widget('menu').locator('.fa-cog').click()
    const settings = overlay.widget('settings')
    await settings.getByText('All modules', { exact: true }).first().click()

    // Hidden until Economy is clicked 5 times.
    await expect(settings.getByRole('switch', { name: 'Net worth' })).toHaveCount(0)
    const economy = settings.locator('.w-group-label', { hasText: /^Economy$/ })
    for (let i = 0; i < 5; i++) await economy.click()
    const reader = settings.getByRole('switch', { name: 'Net worth' })
    await expect(reader).toBeVisible()

    // Asks first, then signs in by itself: the site says who you are.
    await reader.click()
    await settings.getByRole('button', { name: 'Turn on' }).click()
    await expect(reader).toHaveAttribute('aria-checked', 'true')
    await expect(settings.getByText('Signed in as Tester#1234')).toBeVisible()
    await overlay.snap('stash reader on')

    await settings.getByTitle('Close').first().click()
    await expect(settings).toBeHidden()

    // The Net worth window asks which tabs to read before the first read.
    await overlay.widget('menu').getByRole('button', { name: 'All tools' }).click()
    await overlay.page.getByRole('button', { name: /Net worth/ }).first().click()
    // Placed at runtime, so not in the booted config: found by what it shows.
    const picker = overlay.page.locator('[id^="widget-"]').filter({ has: overlay.page.getByText('Tabs to read') })
    await expect(picker).toHaveCount(1)
    const panel = overlay.page.locator(`#${await picker.getAttribute('id')}`)
    await overlay.snap('net worth tab picker')
    // The template picks the currency tab; tick the dump tab too.
    await panel.getByRole('checkbox', { name: /Dump/ }).check()
    await expect(panel.getByText(/2 of 2 tabs/)).toBeVisible()
    await panel.getByRole('button', { name: 'Read these tabs' }).click()

    // The read: Divine and Chaos from the currency tab, Headhunter and the rest
    // from the dump, priced from poe.ninja.
    await expect(panel.getByText('Headhunter').first()).toBeVisible({ timeout: 20_000 })
    // 12 Divine Orbs at 1 div each (poe.ninja's fixture), 340 Chaos at its rate.
    await expect(panel.locator('tr', { hasText: 'Divine Orb' })).toContainText(/12\s*1\.0\s*12\.0/)
    await expect(panel.locator('tr', { hasText: 'Chaos Orb' })).toContainText('340')
    await expect(panel.getByText('Dump', { exact: true }).first()).toBeVisible()
    await overlay.snap('net worth after a read')
    expect(fakeApp.site.requests.some(u => u.includes('tabIndex=1'))).toBe(true)

    // Off again, without asking, and the window goes. The fake app lives on
    // for the next test in this worker, so it must find the reader off.
    await overlay.widget('menu').locator('.fa-cog').click()
    await settings.getByText('All modules', { exact: true }).first().click()
    await reader.click()
    await expect(reader).toHaveAttribute('aria-checked', 'false')
    await expect(panel).toHaveCount(0)
    await settings.getByRole('button', { name: 'Hide experimental' }).click()
    await expect(reader).toHaveCount(0)
  } finally {
    fakeApp.site.reply = null
    fakeApp.site.requests.length = 0
  }
})
