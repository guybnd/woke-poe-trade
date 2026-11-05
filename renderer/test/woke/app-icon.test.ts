import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { APP_ICONS, DEFAULT_APP_ICON, appIconId, appIconUrl } from '@/web/woke/ui/app-icon'

const DIR = path.join(__dirname, '../../public/images/app-icons')

describe('app icons', () => {
  it('defaults to the Eternal Orb', () => {
    expect(DEFAULT_APP_ICON).toBe('eternal-orb')
    expect(APP_ICONS.map(i => i.id)).toContain(DEFAULT_APP_ICON)
    expect(appIconId(undefined)).toBe('eternal-orb')
  })

  it('falls back to the default for an id it does not know', () => {
    expect(appIconUrl('../../secrets')).toBe('/images/app-icons/eternal-orb.png')
  })

  it('keeps a chosen icon', () => {
    expect(appIconUrl('goldrim')).toBe('/images/app-icons/goldrim.png')
  })

  it('has both image files for every choice, and no strays', () => {
    const expected = APP_ICONS.flatMap(i => [`${i.id}.ico`, `${i.id}.png`]).sort()
    expect(fs.readdirSync(DIR).sort()).toEqual(expected)
  })
})
