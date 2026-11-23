// A captured beast's Blood Altar recipes beside its price check (WOKEPOET-485):
// under the instant card, and next to the full window. Craicic Vassal makes a
// map's implicit on its own (3.30: no filler beasts) and corrupts a map twice
// with a Fenumal Scorpion, whose row price checks the Scorpion.
import { test, expect } from './harness'

test('captured beast: the instant card lists its Blood Altar recipes', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/beast-craicic-vassal.txt')
  const card = overlay.page.getByTestId('instant-ninja-card')
  await expect(card).toContainText('38c')
  const altar = card.getByTestId('beast-altar')
  await expect(altar).toContainText('2 recipes')
  const rows = altar.getByTestId('beast-altar-recipe')
  await expect(rows.first()).toContainText('Corrupt a map to have an Implicit Modifier')
  await expect(rows.first()).toContainText('This beast alone')
  await expect(rows.nth(1)).toContainText('Fenumal Scorpion')
  await expect(rows.nth(1)).toContainText('22')
  await expect(altar).not.toContainText('any rare')
  await overlay.snap('craicic vassal instant card with recipes')
  // Another beast's name price checks it.
  await rows.nth(1).getByRole('button', { name: 'Fenumal Scorpion' }).click()
  await expect(overlay.widget('price-check').getByText('Fenumal Scorpion').first()).toBeVisible()
})

test('captured beast: the full price check shows the recipes beside the window', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/beast-craicic-vassal.txt')
  const card = overlay.page.getByTestId('instant-ninja-card')
  await expect(card).toBeVisible()
  await card.getByTestId('instant-ninja-details').click()
  await expect(overlay.page.locator('#price-window')).toBeVisible()
  const altar = overlay.page.getByTestId('beast-altar')
  await expect(altar).toContainText('Corrupt a map twice')
  await overlay.snap('craicic vassal window with recipes')
})
