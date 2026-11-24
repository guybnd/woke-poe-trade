// A Mercenary Warrant's skill rows are gems: each one shows the gem tooltip
// (the tooltip gate checks every visible gem name after the test).
import { test, expect } from './harness'

// Written from the parser's format, not copied from the game.
const WARRANT = ['Item Class: Mercenary Warrants', 'Rarity: Normal', 'Mercenary Warrant', '--------',
  'Mercenary Level: 84', 'Build: Bastion', '--------',
  'Shield Crush', 'Greater Pulverise', 'Greater Fortify', 'Brutality', 'Faster Attacks', '--------',
  'Determination', '--------', 'Dash'].join('\n')

test('a warrant\'s skill rows show the gem tooltip', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem(WARRANT)
  const panel = overlay.widget('price-check')
  const skill = panel.locator('[data-item-tip]', { hasText: 'Shield Crush' }).first()
  await expect(skill).toBeVisible()
})
