// "Report an issue": opened from Settings > Install & updates and from
// Ctrl+Space, it opens a pre-filled GitHub issue (the stubbed openExternal)
// with the player's names and folders hidden.
import { test, expect } from './harness'
import type { FakeApp } from './harness'

test.describe.configure({ mode: 'parallel' })

const ISSUES = 'https://github.com/guybnd/woke-poe-trade/issues/new?'

async function openedUrl (fakeApp: FakeApp, from: number): Promise<URL> {
  await expect.poll(() => fakeApp.shellCalls.slice(from).filter(c => c.op === 'openExternal').length, { timeout: 10_000 }).toBe(1)
  const call = fakeApp.shellCalls.slice(from).find(c => c.op === 'openExternal')!
  expect(call.target.startsWith(ISSUES)).toBe(true)
  return new URL(call.target)
}

test('from Settings: preview shows what is sent, and Open on GitHub opens the scrubbed issue', async ({ overlay, fakeApp }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ overlayActive: true })
  await overlay.widget('menu').locator('.fa-cog').click()
  const settings = overlay.widget('settings')
  await settings.getByText('Install & updates', { exact: true }).first().click()
  await settings.getByRole('button', { name: 'Report an issue…' }).click()

  const dialog = overlay.page.getByRole('dialog', { name: 'Report an issue' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('textbox', { name: 'Title' }).fill('Price check & map scan freeze?')
  await dialog.getByRole('textbox', { name: 'What happened' }).fill('It froze. Log at C:\\Users\\Someone\\AppData\\x.txt')
  await expect(dialog.getByRole('switch', { name: 'Include app info' })).toHaveAttribute('aria-checked', 'true')
  await expect(dialog.getByRole('switch', { name: 'Include recent log' })).toHaveAttribute('aria-checked', 'false')

  await dialog.getByRole('button', { name: 'Preview' }).click()
  const pre = dialog.locator('pre')
  await expect(pre).toContainText('C:\\Users\\<user>\\AppData')
  await expect(pre).toContainText('Version: 0.0.0-test')
  await expect(pre).toContainText('League:')
  await expect(pre).not.toContainText('Someone')
  await overlay.snap('report-issue-preview')
  const shown = await pre.textContent()

  const from = fakeApp.shellCalls.length
  await dialog.getByRole('button', { name: 'Open on GitHub' }).click()
  const url = await openedUrl(fakeApp, from)
  expect(url.searchParams.get('title')).toBe('Price check & map scan freeze?')
  expect(url.searchParams.get('labels')).toBe('bug')
  const body = url.searchParams.get('body')!
  expect(body).toContain('It froze.')
  expect(body).toContain('Tools on:')
  expect(body).not.toContain('Someone')
  // Exactly what the preview showed.
  expect(body).toBe(shown)
  await expect(dialog).toBeHidden()
  expect(overlay.errors).toEqual([])
})

test('from Ctrl+Space: "bug" finds Report an issue, and an idea goes out labelled enhancement', async ({ overlay, fakeApp }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ widgets: [] })
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey('Ctrl + Space')
  const panel = overlay.widget('woke-search')
  const box = panel.getByRole('textbox', { name: 'Search', exact: true })
  await expect(box).toBeFocused()

  for (const q of ['feedback', 'github', 'report']) {
    await box.fill(q)
    await expect(panel.getByRole('button', { name: /\sReport an issue\s*Bug or idea, on GitHub$/ })).toBeVisible()
  }
  await box.fill('bug')
  const hit = panel.getByRole('button', { name: /\sReport an issue\s*Bug or idea, on GitHub$/ })
  await hit.click()
  await box.press('Enter')

  const dialog = overlay.page.getByRole('dialog', { name: 'Report an issue' })
  await expect(dialog).toBeVisible()
  await expect(panel).toBeHidden()
  await dialog.getByRole('button', { name: 'Idea', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Title' }).fill('Show the map tier in the dock')
  await dialog.getByRole('switch', { name: 'Include app info' }).click()
  await overlay.snap('report-issue-idea')

  const from = fakeApp.shellCalls.length
  await dialog.getByRole('button', { name: 'Open on GitHub' }).click()
  const url = await openedUrl(fakeApp, from)
  expect(url.searchParams.get('title')).toBe('Show the map tier in the dock')
  expect(url.searchParams.get('labels')).toBe('enhancement')
  expect(url.searchParams.get('body')).not.toContain('Version:')
  expect(overlay.errors).toEqual([])
})

// The Discord invite sits beside Report an issue: Settings and Ctrl+Space open it in the browser.
async function stubOpen (overlay: { page: import('@playwright/test').Page }) {
  await overlay.page.evaluate(() => {
    (window as any).__opened = [] as string[]
    window.open = ((url?: string | URL) => { (window as any).__opened.push(String(url)); return null }) as typeof window.open
  })
  return () => overlay.page.evaluate(() => (window as any).__opened as string[])
}
const DISCORD = 'https://discord.gg/XrUcvXrt4e'

test('Join the Discord: from Settings', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ overlayActive: true })
  const opened = await stubOpen(overlay)
  await overlay.widget('menu').locator('.fa-cog').click()
  const settings = overlay.widget('settings')
  await settings.getByText('Install & updates', { exact: true }).first().click()
  await settings.getByRole('button', { name: 'Join the Discord' }).click()
  await expect.poll(opened).toEqual([DISCORD])
  await overlay.snap('discord-settings')
})

test('Join the Discord: from Ctrl+Space', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ widgets: [] })
  const opened = await stubOpen(overlay)
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey('Ctrl + Space')
  const panel = overlay.widget('woke-search')
  const box = panel.getByRole('textbox', { name: 'Search', exact: true })
  await expect(box).toBeFocused()
  await box.fill('discord')
  await panel.getByRole('button', { name: /\sJoin the Discord\s*Questions and ideas, with other players$/ }).click()
  await box.press('Enter')
  await expect.poll(opened).toEqual([DISCORD])
})
