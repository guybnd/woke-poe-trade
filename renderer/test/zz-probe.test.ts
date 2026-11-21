import { test } from 'vitest'
import { evaluate, calcNumber } from '@/web/woke/search/lookups/calc'
const unit = (w: string) => ({ d: 'Divine Orb', div: 'Divine Orb', divine: 'Divine Orb', c: 'Chaos Orb', chaos: 'Chaos Orb', ex: 'Exalted Orb' } as any)[w.toLowerCase()] ?? null
const price = (n: string) => n === 'Divine Orb' ? 200 : n === 'Chaos Orb' ? 1 : n === 'Exalted Orb' ? 10 : null
test('p', () => {
  for (const q of ['1,5 + 1', '1,200 * 2', '2k / 4', '50d / 7', '10% + 200', '200 - 10%', '2^3^2', '-2^2', '3 x 4', '50d - 3000', '1 div in chaos', '5 / 0', '0.1+0.2', '1.000,5 + 1', '12,34 * 2', '1,234,567 / 1', '10d * 10%', '10 * 10d', '(2+3)d', '2(3)', '1e3 + 1', '3 % 2', '100 c / d', '2.5k + 1', '10m - 1','1 - 1']) {
    const r = evaluate(q, unit, price)
    console.log(JSON.stringify(q), r ? `${calcNumber(r.value)} deg${r.deg}` : null)
  }
})
