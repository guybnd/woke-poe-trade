// Search palette: settings, their pages and each setting by its label.
import { describe, it, expect } from 'vitest'
import { settingsHits } from '@/web/woke/search/settings-index'
import type { SettingsPage } from '@/web/woke/settings/pages'

const page = (id: string, name: string, find: string[], aliases?: string[]): SettingsPage =>
  ({ id, name, description: '', group: 'general', icon: { fa: 'fas fa-cog' }, find, aliases })

const PAGES = [
  page('game', 'Game & league', ['League', 'Account name']),
  page('hotkeys', 'Hotkeys', ['Overlay key', 'Hotkey clashes'], ['Hotkey list']),
  page('look', 'Look & icon row', ['Text size', 'Font size', 'Icon row', 'Panel size']),
  page('challenges', 'Challenges', ['Challenges', 'Account name'])
]
const names = (q: string) => settingsHits(PAGES, q).map(h => h.name)

describe('settingsHits', () => {
  it('"settings" alone lists Open settings and every page', () => {
    expect(names('settings')).toEqual(['Open settings', 'Game & league', 'Hotkeys', 'Look & icon row', 'Challenges'])
    expect(names('sett')).toEqual(names('settings'))
    expect(names('Options')).toEqual(names('settings'))
    expect(settingsHits(PAGES, 'settings')[0]).toMatchObject({ page: null, label: null })
  })

  it('finds a page by its name or an old name', () => {
    expect(names('hotkeys')).toContain('Hotkeys')
    expect(names('hotkey list')).toEqual(['Hotkeys'])
    expect(names('look')).toEqual(['Look & icon row'])
  })

  it('finds a setting by its label, saying its page', () => {
    const hits = settingsHits(PAGES, 'text size')
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ name: 'Text size', sub: 'Setting · Look & icon row', label: 'Text size' })
    expect(hits[0].page?.id).toBe('look')
  })

  it('a settings word with more words searches the rest, and offers Open settings', () => {
    expect(names('text size settings')).toEqual(['Open settings', 'Text size'])
    expect(names('setting hotkeys')).toEqual(['Open settings', 'Hotkeys'])
  })

  it('a label shows once, and a page is not listed again as its own label', () => {
    expect(names('account')).toEqual(['Account name'])
    expect(names('challenges')).toEqual(['Challenges'])
    // "Hotkey list" is the Hotkeys page's old name.
    expect(settingsHits([page('hotkeys', 'Hotkeys', ['Hotkey list'], ['Hotkey list'])], 'hotkey list').map(h => h.name)).toEqual(['Hotkeys'])
  })

  it('keeps the whole list while a word after "settings" is one letter', () => {
    expect(names('settings h')).toEqual(names('settings'))
  })

  it('"config" is a search, not a settings word', () => {
    expect(settingsHits([page('game', 'Game & league', ['production_Config.ini'])], 'config').map(h => h.name)).toEqual(['production_Config.ini'])
  })

  it('needs two letters, and plain words do not offer Open settings', () => {
    expect(names('t')).toEqual([])
    expect(names('size')).toEqual(['Text size', 'Font size', 'Panel size'])
    expect(names('ope')).toEqual(['Open settings'])
  })
})
