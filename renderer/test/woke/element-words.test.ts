import { describe, it, expect } from 'vitest'
import { elementParts } from '@/web/woke/ui/element-words'

describe('elementParts', () => {
  it('marks element words', () => {
    expect(elementParts('+20% to Fire and Cold Resistances')).toEqual([
      { text: '+20% to ' }, { text: 'Fire', ele: 'fire' }, { text: ' and ' },
      { text: 'Cold', ele: 'cold' }, { text: ' Resistances' }
    ])
  })
  it('leaves other words and empty text alone', () => {
    expect(elementParts('Firestorm')).toEqual([{ text: 'Firestorm' }])
    expect(elementParts('')).toEqual([{ text: '' }])
    expect(elementParts('Chaos')).toEqual([{ text: 'Chaos', ele: 'chaos' }])
  })
})
