// Folds: a section you fold or open stays that way when you come back to it.
import { test, expect } from './harness'

test('a fold stays as left when its page is opened again', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ widgets: [{ wmType: 'woke-mechanics' }], overlayActive: true })
  await overlay.widget('menu').locator('.fa-cog').click()
  const settings = overlay.widget('settings')
  await settings.getByText('League mechanics', { exact: true }).first().click()
  const tab = (name: string) => settings.getByRole('tab', { name })
  const rewards = settings.getByRole('textbox', { name: 'Vorici, Intervention' })

  await tab('Betrayal').click()
  await expect(rewards).toBeHidden()
  await settings.getByRole('button', { name: /Edit Betrayal rewards/ }).click()
  await expect(rewards).toBeVisible()

  // Another settings page, then back.
  await settings.getByText('Price check', { exact: true }).first().click()
  await settings.getByText('League mechanics', { exact: true }).first().click()
  await tab('Betrayal').click()
  await expect(rewards).toBeVisible()

  // Folded, it stays folded too.
  await settings.getByRole('button', { name: /Edit Betrayal rewards/ }).click()
  await expect(rewards).toBeHidden()
  await settings.getByText('Price check', { exact: true }).first().click()
  await settings.getByText('League mechanics', { exact: true }).first().click()
  await tab('Betrayal').click()
  await expect(rewards).toBeHidden()
  expect(await overlay.page.evaluate(() => localStorage.getItem('woke.fold.betrayal-rewards'))).toBe('0')
})
