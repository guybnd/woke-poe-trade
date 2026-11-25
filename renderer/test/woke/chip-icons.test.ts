import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { logLabels } from '@/web/woke/session-story/map-log'
import { MAP_NUMBER_ICONS, MECHANIC_ICONS, logMechanic } from '@/web/woke/ui/game-icons'

const names = new Set(fs.readFileSync(path.join(__dirname, '../../public/data/en/items.ndjson'), 'utf8')
  .split('\n').filter(Boolean).map(l => (JSON.parse(l) as { name: string }).name))

describe('chip icons', () => {
  it('every mechanic the map log names has art', () => {
    const missing = logLabels().filter(l => !logMechanic(l) || !MECHANIC_ICONS[logMechanic(l)!])
    expect(missing).toEqual([])
  })
  it('map numbers draw items that exist', () => {
    const missing = Object.entries(MAP_NUMBER_ICONS).filter(([, i]) => i.item && !names.has(i.item)).map(([k]) => k)
    expect(missing).toEqual([])
  })
})
