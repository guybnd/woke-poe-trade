// woke: the price check's Bulk toggle, remembered for the next checks until
// turned off (veteran review, WOKEPOET-539). Kept per device in localStorage.
import { shallowRef } from 'vue'

const KEY = 'woke.pcBulk'

function read (): boolean {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

export const bulkRemembered = shallowRef(read())

export function rememberBulk (on: boolean): void {
  bulkRemembered.value = on
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {}
}
