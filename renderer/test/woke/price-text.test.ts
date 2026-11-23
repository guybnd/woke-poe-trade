// Price texts get their currency units drawn as icons (WPriceText.vue).
import { describe, expect, it } from 'vitest'
import { splitPriceText } from '@/web/woke/ui/price-text'

const joined = (s: string) => splitPriceText(s).map(p => p.text + (p.raw ?? '')).join('')

describe('splitPriceText', () => {
  it('finds chaos and divine amounts, with or without a space', () => {
    expect(splitPriceText('6.9 div')).toEqual([{ text: '6.9', unit: 'div', raw: ' div' }])
    expect(splitPriceText('1,436c')).toEqual([{ text: '1,436', unit: 'c', raw: 'c' }])
  })

  it('reads "per c" as an icon after "per"', () => {
    expect(splitPriceText('281 per c')).toEqual([{ text: '281 ' }, { text: 'per ', unit: 'c', raw: 'c' }])
  })

  it('leaves words alone and keeps the text whole', () => {
    const s = 'Divine offers ask 1 div each (≈ 180c), 180× as much'
    expect(splitPriceText(s).filter(p => p.unit).map(p => p.unit)).toEqual(['div', 'c'])
    expect(joined(s)).toBe(s)
    expect(splitPriceText('2 chaos orbs, 3 divines')).toEqual([{ text: '2 chaos orbs, 3 divines' }])
  })
  it('needs the unit to stand as its own word after a whole number', () => {
    for (const s of ['upper c', 'super div', '12 div-cards', 'T16 divine', '2 cé']) expect(splitPriceText(s)).toEqual([{ text: s }])
    expect(splitPriceText('-5c')).toEqual([{ text: '-5', unit: 'c', raw: 'c' }])
  })
})
