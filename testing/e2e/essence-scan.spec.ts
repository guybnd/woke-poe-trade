// Essence scan (OCR): Alt+E reads the essence monolith label under the
// cursor, and a monolith holding Misery/Envy/Dread/Scorn says CORRUPT.
import fs from 'fs'
import path from 'path'
import { test, expect, FIXTURES, haveOcr } from './harness'

test.skip(!haveOcr, 'OCR files missing: npm run get:ocr')

test('Alt+E reads a monolith with Misery and Scorn: CORRUPT, with the flagged essences', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-essence-scan', wmWants: 'show' }] })
  // Real screenshot: Screaming Essence of Misery, Rage and Scorn.
  await overlay.showScreen('screens/essence-real-25.png')
  const { cursor } = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'screens/essence-real-25.json'), 'utf8'))
  await overlay.moveMouse(cursor.x, cursor.y)
  await overlay.pressHotkey('Alt + E')

  // While you play the panel stays out of the way: a card by the monolith
  // and a dock icon counting monoliths worth corrupting.
  const card = overlay.page.getByText('Corrupt', { exact: true }).filter({ visible: true })
  await expect(card).toBeVisible({ timeout: 20_000 })
  for (const name of ['Misery', 'Rage', 'Scorn']) {
    await expect(overlay.page.locator('body')).toContainText(name)
  }
  await expect(overlay.dockIcon('essence-scan')).toContainText('1')
  await expect(overlay.widget('woke-essence-scan')).toContainText('1 read')
  await overlay.snap('essence monolith badge')

  // Alt+E again stops scanning: the icon goes.
  await overlay.pressHotkey('Alt + E')
  await expect(overlay.dockIcon('essence-scan')).toHaveCount(0)
})
