// Whether the Loot tab's All loot card shows its full ruler (Guy 2026-11-28:
// open by default, press its name to fold it). Shared by every page and
// remembered on this PC.
import { ref, watch } from 'vue'

const KEY = 'woke-loot-all-open'

function load (): boolean {
  try { return localStorage.getItem(KEY) !== '0' } catch { return true }
}

export const allOpen = ref(load())

watch(allOpen, v => {
  try { localStorage.setItem(KEY, v ? '1' : '0') } catch {}
})
