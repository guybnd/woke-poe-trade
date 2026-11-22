// The Blood Altar table (public/data/bestiary-data.json), fetched once and
// shared: the Ctrl+Space search and the price check's recipe panel both read it.
import { shallowRef } from 'vue'
import type { BestiaryData } from './bestiary'

export const bestiaryData = shallowRef<BestiaryData | null>(null)
let loading: Promise<void> | null = null

export function loadBestiary (): Promise<void> {
  if (bestiaryData.value) return Promise.resolve()
  loading ??= fetch(`${import.meta.env.BASE_URL}data/bestiary-data.json`)
    .then(r => r.json())
    .then(d => { bestiaryData.value = d as BestiaryData })
    .catch(() => {})
    // A failed fetch can be tried again on the next open.
    .finally(() => { loading = null })
  return loading
}
