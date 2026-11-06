// Trades, driven by a recorded hideout session in Client.txt: the
// trade icon and its peek, one key walking a trade (one chat line per press),
// the clickable card, and the sales log feeding Session analytics.
import fs from 'fs'
import path from 'path'
import { test, expect, logFixture } from './harness'

const LINES = logFixture('client-logs/trade-hideout.txt')
const upTo = (text: string) => LINES.slice(0, LINES.findIndex(l => l.includes(text)) + 1)
// A worker's tests share one user data folder, and a reopened offer comes back.
const clearHistory = (userData: string) => fs.rmSync(path.join(userData, 'woke-offer-history'), { recursive: true, force: true })
const TRADE = { wmType: 'woke-trade', stepHotkey: 'F3', busyHotkey: 'F4', ping: false }

test('a buyer whispers: the trade icon peeks, and one key invites, trades, thanks and kicks', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [TRADE] })
  const icon = overlay.dockIcon('trade')
  await expect(icon).toHaveCount(0)

  // Two buyers whisper (Kaltenhalt twice).
  const whispers = upTo('Kaltenhalt: Hi, I would like to buy your Headhunter')
  await overlay.log(whispers)
  await expect(icon).toBeVisible()
  await expect(icon).toContainText('Kaltenhalt: Headhunter Leather Belt · 120 div')
  await overlay.snap('trade icon peeks with the new offer')
  await overlay.log(upTo('#Spammer').slice(whispers.length))
  await expect(icon).toContainText('2')

  // F3: invite the first buyer. Each press types exactly one chat line.
  await overlay.pressHotkey('F3')
  await expect.poll(() => fakeApp.game.chat).toEqual(['/invite Kaltenhalt'])
  // They join: the next press asks to trade.
  const joined = upTo('Kaltenhalt has joined the area.')
  await overlay.log(joined.slice(upTo('#Spammer').length))
  await overlay.pressHotkey('F3')
  await expect.poll(() => fakeApp.game.chat).toEqual(['/invite Kaltenhalt', '/tradewith Kaltenhalt'])

  // The trade goes through: logged, and the key moves on to thanks, then kick.
  await overlay.log(upTo('Trade accepted.').slice(joined.length))
  const logFile = path.join(fakeApp.opts.userData, 'woke-trades', 'Testleague.json')
  await expect.poll(() => fs.existsSync(logFile) && fs.readFileSync(logFile, 'utf8')).toContain('Headhunter Leather Belt')
  await overlay.pressHotkey('F3')
  // Presses closer than half a second are ignored (the app would drop the line).
  await overlay.page.waitForTimeout(600)
  await overlay.pressHotkey('F3')
  await expect.poll(() => fakeApp.game.chat.slice(2)).toEqual(['@Kaltenhalt Thanks, have fun!', '/kick Kaltenhalt'])

  // The bulk buyer is next. Busy key answers them.
  await overlay.page.waitForTimeout(600)
  await overlay.pressHotkey('F4')
  await expect.poll(() => fakeApp.game.chat.at(-1)).toBe("@xXLeagueStartXx Busy right now, I'll invite you in a minute.")
})

test('the trade card lists offers with the stash spot, and its buttons send replies', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [TRADE] })
  await overlay.log(upTo('#Spammer'))
  await overlay.hoverDockIcon('trade')
  const icon = overlay.dockIcon('trade')
  await expect(icon).toContainText('xXLeagueStartXx', { timeout: 5000 })
  await expect(icon).toContainText('10 × Divine Orb')
  await expect(icon).toContainText('"Sale"')
  await expect(icon).toContainText('left 3, top 5')
  await overlay.snap('trade card with two offers')

  // The card's buttons (clickable once the mouse rests on it).
  await icon.locator('[data-reply="invite"]').first().click()
  await expect.poll(() => fakeApp.game.chat).toEqual(['/invite Kaltenhalt'])
  // Open the bulk buyer's row and tell them it's sold.
  await icon.locator('[data-offer="xXLeagueStartXx"] button').first().click()
  await overlay.page.waitForTimeout(600)
  await icon.locator('[data-offer="xXLeagueStartXx"] [data-reply="sold"]').click()
  await expect.poll(() => fakeApp.game.chat.at(-1)).toBe('@xXLeagueStartXx Sorry, 10 × Divine Orb is already sold.')
})

test('offers close on click, show the next step on hover, and a dismissed one can be reopened', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [TRADE] })
  await overlay.log(upTo('#Spammer'))
  await overlay.hoverDockIcon('trade')
  const icon = overlay.dockIcon('trade')
  const row = icon.locator('[data-offer="Kaltenhalt"]')
  const dismiss = row.locator('[data-reply="dismiss"]')
  await expect(dismiss).toBeVisible({ timeout: 5000 })
  await overlay.snap('trade card, top offer open')

  // The top offer closes, and they all stay closed.
  await row.locator('button').first().click()
  await expect(dismiss).toHaveCount(0)
  await expect(icon.locator('[data-reply="dismiss"]')).toHaveCount(0)

  // The next step waits for the mouse.
  const next = row.locator('[data-next]')
  await icon.locator('[data-offer="xXLeagueStartXx"]').hover()
  await expect(next).toHaveCSS('opacity', '0')
  await row.hover()
  await expect(next).toHaveCSS('opacity', '1')
  await overlay.snap('trade card, one-line rows with the next step on hover')
  await next.click()
  await expect.poll(() => fakeApp.game.chat).toEqual(['/invite Kaltenhalt'])

  // Dismissed: dimmed with a way back, and saved.
  await row.locator('button').first().click()
  await dismiss.click()
  const reopen = row.locator('[data-reopen]')
  await expect(reopen).toBeVisible()
  const saved = path.join(fakeApp.opts.userData, 'woke-offer-history', 'offers.json')
  await expect.poll(() => fs.existsSync(saved) && fs.readFileSync(saved, 'utf8')).toContain('Kaltenhalt')
  await overlay.snap('dismissed offer with Reopen')

  // Back where it left off: Trade is next, not Invite.
  await row.hover()
  await reopen.click()
  await expect(row.locator('[data-reply="trade"]')).toBeVisible()
  await expect(reopen).toHaveCount(0)
  // Kept, marked reopened, so a restart can't lose it.
  await expect.poll(() => fs.readFileSync(saved, 'utf8')).toContain('reopenedAt')
})

test('the row style setting: next step always shown, or two lines', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ ...TRADE, rowStyle: 'button' }] })
  await overlay.log(upTo('#Spammer'))
  await overlay.hoverDockIcon('trade')
  const icon = overlay.dockIcon('trade')
  const second = icon.locator('[data-offer="xXLeagueStartXx"]')
  await expect(second.locator('[data-next]')).toHaveCSS('opacity', '1', { timeout: 5000 })
  await overlay.snap('next step always shown')
})

test('two-line rows have no next step button and close on click too', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ ...TRADE, rowStyle: 'full' }] })
  await overlay.log(upTo('#Spammer'))
  await overlay.hoverDockIcon('trade')
  const icon = overlay.dockIcon('trade')
  const row = icon.locator('[data-offer="Kaltenhalt"]')
  await expect(row.locator('[data-reply="dismiss"]')).toBeVisible({ timeout: 5000 })
  await row.locator('button').first().click()
  await expect(row.locator('[data-reply="dismiss"]')).toHaveCount(0)
  await expect(icon.locator('[data-next]')).toHaveCount(0)
  await expect(row).toContainText('Headhunter Leather Belt')
  await overlay.snap('two-line rows')
})

test('the bubble stays past the old five seconds and through a hover', async ({ overlay, fakeApp }) => {
  clearHistory(fakeApp.opts.userData)
  await overlay.boot({ widgets: [TRADE] })
  await overlay.log(upTo('Kaltenhalt: Hi, I would like to buy your Headhunter'))
  const icon = overlay.dockIcon('trade')
  await expect(icon).toContainText('Kaltenhalt: Headhunter Leather Belt · 120 div')
  await overlay.hoverDockIcon('trade')
  await overlay.page.waitForTimeout(5500)
  await expect(icon.locator('[class*="peekText"]')).toContainText('Kaltenhalt: Headhunter')
})

test('with a short bubble time the bubble ends, and the icon stays while offers are open', async ({ overlay, fakeApp }) => {
  clearHistory(fakeApp.opts.userData)
  await overlay.boot({ widgets: [{ ...TRADE, bubbleSeconds: 4 }] })
  await overlay.log(upTo('Kaltenhalt: Hi, I would like to buy your Headhunter'))
  const icon = overlay.dockIcon('trade')
  await expect(icon).toContainText('Kaltenhalt: Headhunter')
  await expect(icon.locator('[class*="peekText"]')).toHaveCount(0, { timeout: 10_000 })
  await expect(icon).toBeVisible()
})

test('an offer open since before a restart shows the bubble', async ({ overlay, fakeApp }) => {
  clearHistory(fakeApp.opts.userData)
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  const whisper = LINES.find(l => l.includes('Kaltenhalt: Hi, I would like to buy your Headhunter'))!
  await overlay.boot({ widgets: [TRADE], logBefore: [whisper.replace(/^\d{4}\/\d\d\/\d\d \d\d:\d\d:\d\d/, stamp)] })
  // A restart, now the app follows this test's log: the first load may have read
  // the tail of the previous test's.
  await expect.poll(() => fakeApp.logFollowed).toBe(true)
  await overlay.page.reload()
  await expect(overlay.dockIcon('trade').locator('[class*="peekText"]')).toContainText('Kaltenhalt: Headhunter', { timeout: 15_000 })
})

test('the skip key moves the bubble on, and reopening brings it back', async ({ overlay, fakeApp }) => {
  clearHistory(fakeApp.opts.userData)
  await overlay.boot({ widgets: [{ ...TRADE, skipHotkey: 'F5' }] })
  await overlay.log(upTo('Kaltenhalt: Hi, I would like to buy your Headhunter'))
  const icon = overlay.dockIcon('trade')
  const bubble = icon.locator('[class*="peekText"]')
  await expect(bubble).toContainText('Kaltenhalt')
  await overlay.log(upTo('#Spammer').slice(upTo('Kaltenhalt: Hi, I would like to buy your Headhunter').length))
  await overlay.pressHotkey('F5')
  await expect(bubble).toContainText('xXLeagueStartXx')
  // Past the old short peek: it stays.
  await overlay.page.waitForTimeout(3000)
  await expect(bubble).toContainText('xXLeagueStartXx')

  await overlay.hoverDockIcon('trade')
  for (const who of ['xXLeagueStartXx', 'Kaltenhalt']) {
    const row = icon.locator(`[data-offer="${who}"]`)
    if (!await row.locator('[data-reply="dismiss"]').count()) await row.locator('button').first().click()
    await row.locator('[data-reply="dismiss"]').click()
  }
  await expect(bubble).toHaveCount(0)
  await icon.locator('[data-offer="Kaltenhalt"]').hover()
  await icon.locator('[data-offer="Kaltenhalt"] [data-reopen]').click()
  await expect(bubble).toContainText('Kaltenhalt')
})

test('the card hints link to Settings and close for good', async ({ overlay, fakeApp }) => {
  clearHistory(fakeApp.opts.userData)
  await overlay.boot({ widgets: [{ wmType: 'woke-trade', ping: false }] })
  await overlay.log(upTo('Kaltenhalt: Hi, I would like to buy your Headhunter'))
  await overlay.hoverDockIcon('trade')
  const icon = overlay.dockIcon('trade')
  const stepTip = icon.locator('[data-tip="trade-step-key"]')
  const windowTip = icon.locator('[data-tip="full-window"]')
  await expect(stepTip).toContainText('Set it in Settings', { timeout: 5000 })
  await expect(windowTip).toBeVisible()
  await overlay.snap('card hints with Settings link')

  await stepTip.getByRole('button', { name: "Don't show this again" }).click()
  await windowTip.getByRole('button', { name: "Don't show this again" }).click()
  await expect(stepTip).toHaveCount(0)
  await expect(windowTip).toHaveCount(0)
  await expect.poll(() => JSON.stringify(overlay.savedWidget('woke-trade') && fakeApp.readConfig()?.woke?.dock?.closedTips)).toContain('trade-step-key')
  await overlay.snap('card with hints closed')
})

test('the Settings link opens the Trades page', async ({ overlay, fakeApp }) => {
  clearHistory(fakeApp.opts.userData)
  await overlay.boot({ widgets: [{ wmType: 'woke-trade', ping: false }] })
  await overlay.log(upTo('Kaltenhalt: Hi, I would like to buy your Headhunter'))
  await overlay.hoverDockIcon('trade')
  await overlay.dockIcon('trade').locator('[data-open-settings]').click({ timeout: 5000 })
  await expect(overlay.page.getByText('Track whispers I send')).toBeVisible()
})

test('the history keeps old offers across restarts and reopens them', async ({ overlay, fakeApp }) => {
  const dir = path.join(fakeApp.opts.userData, 'woke-offer-history')
  fs.mkdirSync(dir, { recursive: true })
  const at = Date.now() - 3 * 86_400_000
  fs.writeFileSync(path.join(dir, 'offers.json'), JSON.stringify([{
    id: 'old-1', dir: 'sell', who: 'Ignithor', body: 'x', item: "Doedre's Damning, Paua Ring", qty: 1, bulk: false,
    price: { amount: 10, currency: 'Chaos Orb' }, league: 'Testleague', tab: { name: '~b/o 10 chaos', left: 20, top: 3 }, note: '',
    at, lastAt: at, repeats: 2, step: 0, inArea: false, traded: false, offline: false, messages: [],
    skippedAt: null, actedAt: null, closedAt: at + 60_000, closed: 'dismissed'
  }]))
  await overlay.boot({ widgets: [{ ...TRADE, wmWants: 'show' as const, tab: 'offers' }], overlayActive: true })
  const trade = overlay.widget('woke-trade')
  const toggle = trade.locator('[data-offer-history] > button').first()
  await expect(toggle).toContainText('History')
  await expect(trade.locator('[data-offer="Ignithor"]')).toHaveCount(0)
  await toggle.click()
  await overlay.snap('offer history open')
  await trade.locator('[data-offer="Ignithor"]').hover()
  await trade.locator('[data-offer="Ignithor"] [data-reopen]').click()
  await expect(trade.locator('[data-offer="Ignithor"] [data-reply="invite"]')).toBeVisible()
  await expect(trade.locator('[data-offer-history]')).toHaveCount(0)
})

test('a history row shows its age until hovered, and its × removes it with an undo', async ({ overlay, fakeApp }) => {
  const dir = path.join(fakeApp.opts.userData, 'woke-offer-history')
  const file = path.join(dir, 'offers.json')
  fs.mkdirSync(dir, { recursive: true })
  const at = Date.now() - 3 * 86_400_000
  const offer = (id: string, who: string) => ({
    id, dir: 'sell', who, body: 'x', item: 'Windscream, Reinforced Greaves', qty: 1, bulk: false,
    price: { amount: 10, currency: 'Chaos Orb' }, league: 'Testleague', tab: null, note: '',
    at, lastAt: at, repeats: 0, step: 0, inArea: false, traded: false, offline: false, messages: [],
    skippedAt: null, actedAt: null, closedAt: at + 60_000, closed: 'dismissed'
  })
  fs.writeFileSync(file, JSON.stringify([offer('h-1', 'Ignithor'), offer('h-2', 'Kaltenhalt')]))
  await overlay.boot({ widgets: [{ ...TRADE, wmWants: 'show' as const, tab: 'offers' }], overlayActive: true })
  const trade = overlay.widget('woke-trade')
  await trade.locator('[data-offer-history] > button').first().click()
  const row = trade.locator('[data-offer="Ignithor"]')
  const other = trade.locator('[data-offer="Kaltenhalt"]')
  const reopen = row.locator('[data-reopen]')
  const remove = row.locator('[data-remove]')
  const actions = reopen.locator('..')

  await other.hover()
  await expect(actions).toHaveCSS('opacity', '0')
  await expect(row).toContainText('2d')
  await row.hover()
  await expect(actions).toHaveCSS('opacity', '1')
  await overlay.snap('history row on hover with Reopen and remove')

  await remove.click()
  await expect(row).toHaveCount(0)
  await expect.poll(() => fs.readFileSync(file, 'utf8')).not.toContain('Ignithor')
  await overlay.snap('history row removed with undo')

  await overlay.page.getByRole('button', { name: 'Undo' }).click()
  await expect(row).toHaveCount(1)
  await expect.poll(() => fs.readFileSync(file, 'utf8')).toContain('Ignithor')
})

test('an offer reopened before a restart comes back open, old as it is', async ({ overlay, fakeApp }) => {
  const dir = path.join(fakeApp.opts.userData, 'woke-offer-history')
  fs.mkdirSync(dir, { recursive: true })
  const at = Date.now() - 3 * 86_400_000
  fs.writeFileSync(path.join(dir, 'offers.json'), JSON.stringify([{
    id: 'old-2', dir: 'sell', who: 'Ignithor', body: 'x', item: "Doedre's Damning, Paua Ring", qty: 1, bulk: false,
    price: { amount: 10, currency: 'Chaos Orb' }, league: 'Testleague', tab: null, note: '',
    at, lastAt: at, repeats: 0, step: 0, inArea: false, traded: false, offline: false, messages: [],
    skippedAt: null, actedAt: null, closedAt: at + 60_000, closed: 'dismissed', reopenedAt: Date.now() - 60_000
  }]))
  await overlay.boot({ widgets: [{ ...TRADE, wmWants: 'show' as const, tab: 'offers' }], overlayActive: true })
  const trade = overlay.widget('woke-trade')
  await expect(trade.locator('[data-offer="Ignithor"] [data-reply="invite"]')).toBeVisible()
  await expect(trade.locator('[data-offer-history]')).toHaveCount(0)
})

test('whispers you send show under the offers; the sales log and Session analytics show the sale', async ({ overlay }) => {
  await overlay.boot({
    widgets: [{ ...TRADE, wmWants: 'show' as const, tab: 'log' }, { wmType: 'woke-session-analytics', wmWants: 'show' as const }],
    overlayActive: true
  })
  await overlay.log(LINES)
  const trade = overlay.widget('woke-trade')
  await expect(trade).toContainText('Headhunter Leather Belt')
  await expect(trade).toContainText('+120 div')
  // The analytics window sits over the tabs in this test layout.
  await trade.getByRole('tab', { name: /Offers/ }).dispatchEvent('click')
  // Our own whisper to a seller, and the bulk buyer still waiting.
  await expect(trade).toContainText('Ozzy_Seller')
  await expect(trade).toContainText('Mageblood Heavy Belt')
  await overlay.snap('trades window')
  await expect(overlay.widget('woke-session-analytics').locator('[data-analytics="trading"]')).toContainText('Trading')
})
