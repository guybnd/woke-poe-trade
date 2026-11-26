// A unique tooltip's Foulborn swap, Vestigial implicit and the cards that
// give it (tooltip audit picks I2, I3), on the real tooltip data.
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { uniqueExtraSections } from '@/web/woke/ui/tooltip/unique-tip-extras'
import type { TipLine, TipPack } from '@/web/woke/ui/tooltip/tip-content'

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/data/tips', f), 'utf8'))
const pack: TipPack = { 'uniques': read('uniques.json'), 'unique-extras': read('unique-extras.json'), 'items': read('items.json'), 'vestigial': read('vestigial.json') }
const text = (sections: TipLine[][]) => sections.flat().map(l => l.map(p => p.text).join(''))
const noPrices = { card: () => null, unique: null, format: (c: number) => `${c}c` }

describe('unique tooltip extras', () => {
  it('names the mod a Foulborn copy gives up', () => {
    const lines = text(uniqueExtraSections({ name: "Foulborn Utula's Hunger" }, pack, noPrices))
    expect(lines).toContain('Replaces: +(704-1000) to maximum Life if there are no Life Modifiers on other Equipped Items')
  })
  it('shows the Vestigial implicit', () => {
    const lines = text(uniqueExtraSections({ name: "Utula's Hunger" }, pack, noPrices))
    expect(lines).toContain('Vestigial: +250 to maximum Life if there are no Life Modifiers on other Equipped Items')
  })
  it('lists the card that gives it, with the set against the unique', () => {
    const prices = { card: (n: string) => n === 'The Apothecary' ? 3000 : null, unique: 20000, format: (c: number) => `${c}c` }
    const lines = text(uniqueExtraSections({ name: 'Mageblood' }, pack, prices))
    expect(lines).toContain('From card: The Apothecary (5) · set 15000c · 25% less than buying it')
  })
  it('says a card reward comes corrupted, and leaves out prices it lacks', () => {
    const lines = text(uniqueExtraSections({ name: 'Headhunter' }, pack, noPrices))
    expect(lines).toContain('From card: The Fiend (11), corrupted')
  })
  it('compares no corrupted reward with the plain unique\'s price', () => {
    const prices = { card: () => 1000, unique: 50000, format: (c: number) => `${c}c` }
    expect(text(uniqueExtraSections({ name: 'Headhunter' }, pack, prices))).toContain('From card: The Fiend (11), corrupted · set 11000c')
  })
  it('names each conqueror\'s keystone on a Timeless jewel', () => {
    const lines = text(uniqueExtraSections({ name: 'Militant Faith' }, pack, noPrices))
    expect(lines).toContain('The conqueror decides the keystone:')
    expect(lines).toContain('Avarius · Power of Purpose')
  })
  it('adds nothing for a unique with none of it', () => {
    expect(uniqueExtraSections({ name: 'Nonexistent Thing' }, pack, noPrices)).toEqual([])
  })
})
