// Search palette: campaign zone cards from the levelling route.
import { describe, it, expect } from 'vitest'
import { rewardCounts, zoneCard, zoneFacts, zoneLookup } from '@/web/woke/search/lookups/zones'
import { routeData, routeSources } from '@/web/woke/campaign/route-data'
import { EXAMPLES } from '@/web/woke/search/lookups/examples'
import raw from '@/web/woke/pob-builds/gem-sources.json'
import type { GemTable } from '@/web/woke/search/lookups/gems'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const zones = zoneFacts(routeSources, routeData)
const ctx = {} as LookupContext
const byId = (id: string) => zones.find(z => z.id === id)!

describe('zoneFacts', () => {
  it('reads act, level, waypoint and town from the route data', () => {
    const coast = byId('1_1_2')
    expect(coast).toMatchObject({ name: 'The Coast', act: 1, level: 2, waypoint: true, town: false, townName: "Lioneye's Watch" })
    expect(coast.next).toEqual(['The Mud Flats', 'The Tidal Island'])
  })
  it('puts a boss in the zone the route kills it in, with its arena and level', () => {
    expect(byId('1_1_7_2').bosses).toEqual([{ name: 'Brutus, Lord Incarcerator', arena: "The Warden's Quarters", level: 8 }])
    expect(byId('1_1_1').bosses.map(b => b.name)).toEqual(['Hillock'])
  })
  it('marks trial zones, quest objectives and town hand-ins', () => {
    expect(byId('1_1_7_1').trial).toBe(true)
    expect(byId('1_1_2').trial).toBe(false)
    expect(byId('1_1_3').objectives).toContain('Glyph')
    expect(byId('1_1_town').quests).toContain('Enemy at the Gate')
    expect(byId('1_1_town').bosses).toEqual([])
  })
  it('shows the Brine King arena by its real name', () => {
    expect(byId('2_6_15').bosses[0].arena).toBe("The Brine King's Throne")
  })
  it('leaves out "Kill Everything" lines', () => {
    expect(zones.flatMap(z => z.bosses).map(b => b.name)).not.toContain('Everything')
  })
})

describe('zoneLookup', () => {
  const lookup = zoneLookup(zones)
  it('finds both acts of a name, act 1 first', () => {
    const cards = lookup('the coast', ctx)
    expect(cards.map(c => c.sub)).toEqual(['Act 1 · level 2', 'Act 6 · level 45'])
    expect(lookup('coast', ctx)).toHaveLength(2)
  })
  it('lists every Lunaris Temple, act 8 too', () => {
    const subs = lookup('lunaris temple', ctx).map(c => c.sub)
    expect(subs).toContain('Act 8 · level 59')
    expect(subs.filter(s => s.startsWith('Act 8'))).toHaveLength(2)
  })
  it('needs four letters past "the"', () => {
    expect(lookup('the', ctx)).toEqual([])
    expect(lookup('the c', ctx)).toEqual([])
  })
  it('answers its example', () => {
    expect(EXAMPLES.some(e => e.query === 'the coast')).toBe(true)
    expect(lookup('the coast', ctx)[0].name).toBe('The Coast')
  })
})

describe('zoneCard', () => {
  it('shows the facts as rows and the route on', () => {
    const card = zoneCard(byId('1_1_2'))
    expect(card.sections[0].rows).toEqual([
      { label: 'Act', value: '1' },
      { label: 'Area level', value: '2' },
      { label: 'Waypoint', value: 'Yes' },
      { label: 'Town', value: "Lioneye's Watch" }
    ])
    expect(card.sections.find(s => s.label === 'Next on the route')!.text).toEqual(['The Mud Flats, The Tidal Island'])
    expect(card.actions[0]).toEqual({ label: 'poedb', url: 'https://poedb.tw/us/The_Coast' })
  })
  it('counts gem rewards for town hand-ins', () => {
    const card = zoneCard(byId('1_1_town'), rewardCounts(raw as unknown as GemTable))
    expect(card.sub).toBe('Act 1 town')
    expect(card.sections[0].rows!.map(r => r.label)).not.toContain('Area level')
    const quest = card.sections.find(s => s.label === 'Quests handed in here')!.rows!.find(r => r.label === 'Enemy at the Gate')!
    expect(quest.value).toMatch(/^gem reward: pick from \d+, all classes$/)
  })
  it('calls Karui Shores the epilogue town', () => {
    const card = zoneCard(zones.find(z => z.name === 'Karui Shores')!)
    expect(card.sub).toBe('Epilogue town')
    expect(card.sections[0].rows![0]).toEqual({ label: 'Act', value: 'Epilogue' })
  })
  it('lists the boss with its arena and level', () => {
    const rows = zoneCard(byId('1_1_7_2')).sections.find(s => s.label === 'Bosses')!.rows!
    expect(rows).toEqual([{ label: 'Brutus, Lord Incarcerator', value: "The Warden's Quarters · level 8" }])
  })
})
