import { describe, it, expect } from 'vitest'
import { reactive } from 'vue'
import { rawClone } from '@/web/woke/raw-clone'

describe('rawClone', () => {
  it('copies a plain row that holds a reactive part (a split row)', () => {
    const source = reactive({ modifier: { text: 'a' }, list: [1, 2] })
    const row = { sources: [source], roll: { min: 3 } }
    const list = reactive([row])
    expect(() => structuredClone([{ sources: [source] }])).toThrow()
    const copy = rawClone(list)
    expect(copy).toEqual([{ sources: [{ modifier: { text: 'a' }, list: [1, 2] }], roll: { min: 3 } }])
    copy[0].roll.min = 9
    expect(row.roll.min).toBe(3)
  })
})
