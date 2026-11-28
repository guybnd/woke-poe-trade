// Gems on the Loot tab (Guy's picks, 2026-11-27): each poe.ninja line is a
// band the filter matches by level, quality and corruption; Exceptional,
// Awakened and Transfigured are Always; 20% quality shows at least Small.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { renameBases } from '@/web/woke/loot-filter/gem-bases'
import { CURRENCY_TYPE, applyCurrency, currencyItems, defaultCurrency, kindOf } from '@/web/woke/loot-filter/currency-weights'
import { gemBand, gemCategoryOf } from '@/web/woke/loot-filter/gem-classes'
import type { GemLine } from '@/web/woke/loot-filter/gem-classes'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { neverSink } from '../helpers/neversink'

const SEMI = neverSink('2-SEMI-STRICT')
const lookup: PriceLookup = (_g, base) => base === 'Divine Orb' ? { chaos: 160, thin: false } : null
const GEMS: GemLine[] = [
  { name: 'Enlighten Support', variant: '4/20c', chaos: 2000, thin: false },
  { name: 'Enlighten Support', variant: '3', chaos: 450, thin: false },
  { name: 'Arc', variant: '21/20c', chaos: 40, thin: false },
  { name: 'Arc', variant: '20/20', chaos: 1, thin: false },
  { name: 'Arc', variant: '1', chaos: 0.05, thin: false },
  { name: 'Ice Nova', variant: '1', chaos: 0.05, thin: false },
  { name: 'Ice Nova of Frostbolts', variant: '1', chaos: 0.1, thin: false },
  { name: 'Herald of Ice', variant: '1', chaos: 0.05, thin: false },
  { name: 'More Duration Support', variant: '21/23c', chaos: 8, thin: false },
  { name: 'More Duration Support', variant: '20/20c', chaos: 20700, thin: true },
  { name: 'More Duration Support', variant: '1', chaos: 1, thin: false },
  { name: 'Eclipse Support', variant: '3/20c', chaos: 20000, thin: true },
  { name: 'Eclipse Support', variant: '4/23c', chaos: 27600, thin: true }
]
const gem = (name: string, level: number, quality = 0, more: Partial<ItemFacts> = {}): ItemFacts => ({
  name, baseType: name, itemClass: name.endsWith('Support') ? 'Support Gems' : 'Skill Gems', gemLevel: level, quality, corrupted: false, transfigured: false, areaLevel: 83, influences: [], explicitModNames: [], ...more
} as ItemFacts)

describe('gems on the Loot tab', () => {
  it('reads bands and folds', () => {
    expect(gemBand('21/20c')).toEqual({ level: 21, quality: 20, corrupted: true })
    expect(gemBand('3')).toEqual({ level: 3, quality: 0, corrupted: false })
    const names = new Set(GEMS.map(g => g.name))
    expect(gemCategoryOf('Ice Nova of Frostbolts', names)).toBe('gemtrans')
    expect(gemCategoryOf('Herald of Ice', names)).toBe('gemskill')
    expect(gemCategoryOf('Awakened Enlighten Support', names)).toBe('gemexc')
    expect(gemCategoryOf('Greater Spell Echo Support', names)).toBe('gemexc')
    expect(gemCategoryOf('Eclipse Support', names)).toBe('gemexc')
    expect(gemCategoryOf('Greater Multiple Projectiles Support', names)).toBe('gemsup')
    expect(kindOf('gemawk')).toBe('gems')
    const items = currencyItems(parseFilter(SEMI), lookup, {}, null, GEMS).filter(i => kindOf(i.cat) === 'gems')
    // A thin band counts at most 3× a solid band at least as good; a cheaper,
    // worse band (level 1) never caps it; with none, as poe.ninja has it.
    expect(items.find(i => i.name === 'More Duration Support 20/20c')).toMatchObject({ chaos: 24, est: true })
    expect(items.find(i => i.name === 'Eclipse Support 3/20c')).toMatchObject({ chaos: 20000, est: true })
    expect(items.find(i => i.name === 'Eclipse Support 4/23c')).toMatchObject({ chaos: 27600, est: true, cat: 'gemexc' })
    expect(items.find(i => i.name === 'Arc 21/20c')).toMatchObject({ bt: 'Arc', chaos: 40, cls: 'Skill Gems', cat: 'gemskill' })
  })

  it('shows a gem by its best band, in maps', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    const doc = parseFilter(SEMI)
    applyCurrency(doc, cfg, lookup, null, GEMS)
    renameBases(doc, n => n === 'Ice Nova of Frostbolts' ? 'Ice Nova' : undefined)
    const hit = (f: ItemFacts) => matchItem(doc, f).final?.block
    const r = hit(gem('Arc', 21, 20, { corrupted: true }))
    expect(r).toMatchObject({ type: CURRENCY_TYPE, tier: 's4' })
    expect(hit(gem('Arc', 20, 20))).toMatchObject({ type: CURRENCY_TYPE, tier: 's2' })
    expect(hit(gem('Arc', 5))?.visibility).toBe('Hide')
    // 20% quality: a Gemcutter's Prism, at least Small.
    expect(hit(gem('Arc', 5, 20))).toMatchObject({ visibility: 'Show', tier: 's1' })
    // Exceptional is Always, whatever the band.
    expect(hit(gem('Enlighten Support', 1))?.visibility).toBe('Show')
    // A transfigured gem isn't caught by its base gem's cheap band.
    expect(hit(gem('Ice Nova', 1, 0, { transfigured: true }))?.visibility).toBe('Show')
    expect(hit(gem('Ice Nova', 1))?.visibility).toBe('Hide')
    // Levelling is NeverSink's.
    expect(hit(gem('Arc', 5, 0, { areaLevel: 30 }))?.type).not.toBe(CURRENCY_TYPE)
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })
})
