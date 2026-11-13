// Saved Stacked Deck sessions: written by the tracker, read by its window,
// Session analytics' Stacked decks tab and the price check's verdict. Files
// live in the main process, beside the farming sessions
// (main/src/woke/session-store.ts).
import { shallowRef } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { hostRequest } from '../shared/host'
import type { DeckRecord } from './deck'

export const useDeckStore = createGlobalState(() => {
  const records = shallowRef<DeckRecord[]>([])
  const loaded = shallowRef(false)
  const error = shallowRef('')
  let loading: Promise<void> | null = null
  // Deleted here: a list read already on its way may still have them.
  const deleted = new Set<string>()

  function load (force = false): Promise<void> {
    if (loading && !force) return loading
    loading = (hostRequest('deck-sessions-list', {}) as Promise<DeckRecord[]>)
      .then(list => {
        // A save made while reading is kept.
        const known = new Set(list.map(r => r.id))
        records.value = [...list.filter(r => !deleted.has(r.id)), ...records.value.filter(r => !known.has(r.id))].sort((a, b) => b.endedAt - a.endedAt)
        loaded.value = true
        error.value = ''
      })
      .catch((err: Error) => {
        error.value = err.message
        loading = null
      })
    return loading
  }

  async function save (r: DeckRecord): Promise<void> {
    // Plain copy: the record may come from reactive config.
    const plain = JSON.parse(JSON.stringify(r)) as DeckRecord
    deleted.delete(plain.id)
    records.value = [plain, ...records.value.filter(x => x.id !== plain.id)].sort((a, b) => b.endedAt - a.endedAt)
    await hostRequest('deck-sessions-save', { session: plain })
  }

  async function remove (id: string): Promise<void> {
    deleted.add(id)
    records.value = records.value.filter(r => r.id !== id)
    await hostRequest('deck-sessions-delete', { id })
  }

  return { records, loaded, error, load, save, remove }
})
