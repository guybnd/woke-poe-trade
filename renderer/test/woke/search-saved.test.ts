// Search palette: your saved regexes, trade searches, PoB builds and atlas strategies.
import { describe, it, expect } from 'vitest'
import { savedItems, savedLookup } from '@/web/woke/search/lookups/saved'
import type { RegexEntry } from '@/web/woke/regex-library/widget'
import type { TradeSearchEntry } from '@/web/woke/trade-searches/widget'
import type { PobBuildEntry } from '@/web/woke/pob-builds/widget'
import type { AtlasStrategy } from '@/web/woke/atlas/strategies'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const ctx = {} as LookupContext
const regex: RegexEntry[] = [
  { id: 3, name: 'Breach no reflect', text: '"!eflec|t regen"', category: 'Atlas/Breach juice', tags: [], notes: 'Skips reflect.', hotkey: null },
  { id: 4, name: '', text: 'eflec', negate: true, category: '', tags: ['maps'], notes: '', hotkey: null }
]
const trade: TradeSearchEntry[] = [
  { id: 7, name: 'Splinters bulk', url: 'https://www.pathofexile.com/trade/search/Standard/abc', category: 'Breach', tags: [], notes: '', hotkeyOverlay: null, hotkeyExternal: null, openCount: 2 }
]
const builds: PobBuildEntry[] = [
  { relPath: '3.30/Breach farmer LA.xml', name: 'Breach farmer LA', folder: '3.30', mtime: 0, className: 'Ranger', ascendClassName: 'Deadeye', level: 92, mainSkill: 'Lightning Arrow' }
]
const atlas = [
  { id: 1, name: 'Essence farm', folder: 'Juicing', league: 'Covens of Umbra', tags: ['breach'], treeUrl: '', threads: [], scarabs: '', device: '', regex: '', notes: '' }
] as AtlasStrategy[]
const lookup = savedLookup(savedItems({ regex, trade, builds, atlas }))

describe('savedLookup', () => {
  it('finds names first, then folders and tags, A to Z', () => {
    const cards = lookup('breach', ctx)
    expect(cards.map(c => c.name)).toEqual(['Breach farmer LA', 'Breach no reflect', 'Essence farm', 'Splinters bulk'])
    expect(cards.map(c => c.sub)).toEqual(['PoB build · 3.30', 'Regex · Atlas/Breach juice', 'Atlas strategy · Juicing', 'Trade search · Breach'])
  })
  it('opens each in its own tool, by id or build file', () => {
    const [build, re, at, tr] = lookup('breach', ctx)
    expect(build.actions[0]).toEqual({ label: 'Open in PoB builds', open: { tool: 'woke-pob-builds', id: '3.30/Breach farmer LA.xml' } })
    expect(re.actions).toEqual([
      { label: 'Open in Regex library', open: { tool: 'woke-regex-library', id: '3' } },
      { label: 'Copy', copy: '"!eflec|t regen"' }
    ])
    expect(tr.actions[0]).toEqual({ label: 'Open in Trade searches', open: { tool: 'woke-trade-searches', id: '7' } })
    expect(at.actions[0]).toEqual({ label: 'Open in Atlas strategies', open: { tool: 'woke-atlas-strategies', id: '1' } })
  })
  it('names an unnamed regex by its text, as the stash search gets it', () => {
    const [card] = lookup('eflec', ctx).filter(c => c.id === 'saved:regex:4')
    expect(card.name).toBe('"!eflec"')
    expect(card.sections[0].rows).toEqual([{ label: 'Regex library', value: 'Top level' }])
  })
  it('shows a build\'s class and main skill', () => {
    const [card] = lookup('farmer', ctx)
    expect(card.sections[0].rows).toEqual([
      { label: 'PoB builds', value: '3.30' },
      { label: 'Class', value: 'Deadeye, level 92' },
      { label: 'Main skill', value: 'Lightning Arrow' }
    ])
  })
  it('leaves the locked root folders of strategy and build regexes out of the search', () => {
    const filed: RegexEntry[] = [
      { id: 9, name: 'Map mods', text: 'eflec', category: 'Atlas strategies/Juicing/Breach juice', tags: [], notes: '', hotkey: null },
      { id: 10, name: 'Flasks', text: 'flask', category: 'PoB builds/3.30/Breach farmer LA', tags: [], notes: '', hotkey: null }
    ]
    const find = savedLookup(savedItems({ regex: filed }))
    expect(find('atlas', ctx)).toEqual([])
    expect(find('pob builds', ctx)).toEqual([])
    expect(find('juicing', ctx).map(c => c.sub)).toEqual(['Regex · Atlas strategies/Juicing/Breach juice'])
    expect(find('breach farmer', ctx).map(c => c.name)).toEqual(['Flasks'])
  })
  it('skips matches inside a word and short queries', () => {
    expect(lookup('reach', ctx)).toEqual([])
    expect(lookup('br', ctx)).toEqual([])
    expect(savedLookup([])('breach', ctx)).toEqual([])
  })
})
