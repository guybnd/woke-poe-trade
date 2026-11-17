// Folds stay as left: one shared state per key, saved in storage.
import { beforeAll, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

const store = new Map<string, string>()
beforeAll(() => {
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) }
  }
})

describe('useFold', () => {
  it('starts as asked, is one state per key, and saves a change', async () => {
    const { useFold } = await import('@/web/woke/ui/fold')
    const a = useFold('t.one')
    expect(a.value).toBe(false)
    expect(useFold('t.one')).toBe(a)
    a.value = true
    await nextTick()
    expect(store.get('woke.fold.t.one')).toBe('1')
  })

  it('reads a saved state over the default', async () => {
    store.set('woke.fold.t.saved', '0')
    const { useFold } = await import('@/web/woke/ui/fold')
    expect(useFold('t.saved', true).value).toBe(false)
  })

  it('keeps which one of several is open', async () => {
    const { useOneOpen } = await import('@/web/woke/ui/fold')
    const o = useOneOpen<'a' | 'b'>('t.acc')
    expect(o.value).toBeNull()
    o.value = 'b'
    await nextTick()
    expect(store.get('woke.fold.t.acc')).toBe('b')
    o.value = null
    await nextTick()
    expect(store.get('woke.fold.t.acc')).toBe('')
  })
})
