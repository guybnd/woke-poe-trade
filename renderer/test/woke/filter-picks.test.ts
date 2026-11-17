// Ticked rows in the Prices tab's bulk lists (would move, not moved).
import { describe, it, expect } from 'vitest'
import { nextTick, ref } from 'vue'
import { usePicks } from '@/web/woke/loot-filter/picks'

interface Row { id: string, on?: boolean }
const click = (checked: boolean, shiftKey = false) => ({ target: { checked }, shiftKey }) as unknown as MouseEvent

describe('usePicks', () => {
  it('starts rows from their default and keeps a pick when the list changes', async () => {
    const list = ref<Row[]>([{ id: 'a', on: true }, { id: 'b' }])
    const p = usePicks(() => list.value, r => r.id, r => r.on === true)
    expect(p.picked.value.map(r => r.id)).toEqual(['a'])
    p.click(click(true), 1)
    list.value = [...list.value, { id: 'c', on: true }]
    await nextTick()
    expect(p.picked.value.map(r => r.id)).toEqual(['a', 'b', 'c'])
    expect(p.all.value).toBe(true)
  })

  it('shift + click sets the run from the last click', () => {
    const list = ref<Row[]>(['a', 'b', 'c', 'd', 'e'].map(id => ({ id })))
    const p = usePicks(() => list.value, r => r.id)
    p.click(click(true), 1)
    p.click(click(true, true), 3)
    expect(p.picked.value.map(r => r.id)).toEqual(['b', 'c', 'd'])
    expect(p.some.value).toBe(true)
  })

  it('only counts rows in the list it reads now (a filter narrows the picks)', () => {
    const rows = ['cur1', 'cur2', 'card1'].map(id => ({ id }))
    const only = ref<string | null>(null)
    const p = usePicks(() => rows.filter(r => !only.value || r.id.startsWith(only.value)), r => r.id)
    p.where(() => true)
    only.value = 'card'
    expect(p.picked.value.map(r => r.id)).toEqual(['card1'])
    p.where(() => false)
    only.value = null
    expect(p.picked.value.map(r => r.id)).toEqual(['cur1', 'cur2'])
  })

  it('a forgotten row comes back with its default', async () => {
    const list = ref<Row[]>([{ id: 'a' }])
    const p = usePicks(() => list.value, r => r.id, () => false)
    p.where(() => true)
    p.forget(list.value)
    list.value = []
    await nextTick()
    list.value = [{ id: 'a' }]
    await nextTick()
    expect(p.picked.value).toEqual([])
  })
})
