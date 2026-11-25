// A gear base's tooltip line on the item level its best tiers need (tooltip
// audit pick I7), on the real tier data.
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { topTierLine } from '@/web/woke/ui/tooltip/base-tip-extras'

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/data/mod-tiers.json'), 'utf8'))
const text = (key: string) => topTierLine(data, key)?.map(p => p.text).join('')

describe('best tiers line', () => {
  it('names the three highest item levels, highest first', () => {
    const line = text('Boots_dex')!
    expect(line.startsWith('Best tiers need item level 86 Movement Speed · 85 Suppression · 84 ')).toBe(true)
    expect(line).toContain('Resistances')
  })
  it('counts the three resistances once', () => {
    expect(text('Rings')!.match(/Resistances/g)).toHaveLength(1)
  })
  it('has no line for a class the data lacks', () => {
    expect(topTierLine(data, 'Flasks')).toBeNull()
  })
})
