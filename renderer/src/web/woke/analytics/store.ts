// Saved sessions, shared by Farming (writes) and Session analytics
// (reads). Files live in the main process (main/src/woke/session-store.ts).
import { shallowRef } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { hostRequest } from '../shared/host'
import type { SessionRecord } from './types'

export const useSessionStore = createGlobalState(() => {
  const sessions = shallowRef<SessionRecord[]>([])
  const loaded = shallowRef(false)
  const error = shallowRef('')
  let loading: Promise<void> | null = null

  function load (force = false): Promise<void> {
    if (loading && !force) return loading
    loading = (hostRequest('sessions-list', {}) as Promise<SessionRecord[]>)
      .then(list => {
        sessions.value = list.sort((a, b) => b.endedAt - a.endedAt)
        loaded.value = true
        error.value = ''
      })
      .catch((err: Error) => {
        error.value = err.message
        loading = null
      })
    return loading
  }

  function put (s: SessionRecord) {
    sessions.value = [s, ...sessions.value.filter(x => x.id !== s.id)].sort((a, b) => b.endedAt - a.endedAt)
  }

  async function save (s: SessionRecord): Promise<void> {
    // Plain copy: the record may come from reactive config.
    const plain = JSON.parse(JSON.stringify(s)) as SessionRecord
    put(plain)
    await hostRequest('sessions-save', { session: plain })
  }

  async function saveMany (list: SessionRecord[]): Promise<void> {
    if (!list.length) return
    await hostRequest('sessions-save-many', { sessions: JSON.parse(JSON.stringify(list)) })
    await load(true)
  }

  async function remove (id: string): Promise<void> {
    sessions.value = sessions.value.filter(s => s.id !== id)
    await hostRequest('sessions-delete', { id })
  }

  return { sessions, loaded, error, load, save, saveMany, remove }
})
