// A build item against the one the synced character wears there.
import { beforeAll, describe, expect, it } from 'vitest'
import { loadGameData } from '../helpers/game-data'
import { characterStatus } from '@/web/woke/pob-builds/character'
import { personalOn } from '@/web/woke/personal'
import { wornCompare } from '@/web/woke/pob-builds/worn-compare'
import type { PobItem } from '@/web/woke/pob-builds/widget'

beforeAll(loadGameData)

const belt = (name: string, life: number): PobItem => ({ rarity: 'RARE', name, base: 'Heavy Belt', sockets: '', implicits: ['+25 to Strength'], mods: [`+${life} to maximum Life`] })

describe('wornCompare', () => {
  it('compares the build item with the worn one in its slot', () => {
    personalOn.value = true
    characterStatus.value = {
      snapshot: { version: 1, account: 'a', readAt: 0, character: { name: 'whekq', league: 'Covens', class: 'Gladiator', level: 81 }, gear: [{ slot: 'Belt', item: belt('Horror Shackle', 50) }], gems: [], tree: { nodes: [], clusterNodes: [], masteries: {}, jewels: [] } },
      error: null,
      pending: false,
      auto: false,
      nextAutoAt: 0
    }
    const c = wornCompare('Belt', belt('Eagle Locket', 90))!
    expect(c.title).toBe('Against your Horror Shackle')
    expect(c.result.verdict).toBe('better')
    expect(c.result.rows.find(r => r.label === 'Life')?.delta).toBe('+40')
    expect(wornCompare('Gloves', belt('x', 1))?.result.summary).toBe('You wear nothing there.')
  })

  it('is null with the stash reader off', () => {
    personalOn.value = false
    expect(wornCompare('Belt', belt('Eagle Locket', 90))).toBeNull()
  })
})

describe('wornCompare across rings and flasks', () => {
  it('says you already wear a ring worn in the other ring slot', () => {
    personalOn.value = true
    const ring = (name: string): PobItem => ({ rarity: 'UNIQUE', name, base: 'Opal Ring', sockets: '', implicits: [], mods: [] })
    characterStatus.value = {
      snapshot: { version: 1, account: 'a', readAt: 0, character: { name: 'whekq', league: 'Covens', class: 'Gladiator', level: 81 }, gear: [{ slot: 'Ring 1', item: ring('B') }, { slot: 'Ring 2', item: ring('A') }], gems: [], tree: { nodes: [], clusterNodes: [], masteries: {}, jewels: [] } },
      error: null,
      pending: false,
      auto: false,
      nextAutoAt: 0
    }
    expect(wornCompare('Ring 1', ring('A'))?.result.summary).toBe('Already on your character.')
  })
})
