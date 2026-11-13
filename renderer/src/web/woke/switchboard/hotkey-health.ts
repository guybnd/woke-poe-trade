// Hotkey problems for the warning on the rail, the health icon and the
// settings window: two actions on one key, and keys another program holds
// (reported by main when it registers them). Read from the same field list
// the Hotkeys page edits, so a new hotkey is checked as soon as it's listed.
import { computed, shallowRef } from 'vue'
import { AppConfig } from '@/web/Config'
import { MainProcess } from '@/web/background/IPC'
import { hostRequest } from '../shared/host'
import { normalizeKey } from '../ui/hotkey-context'
import { fieldKey, hotkeyFields, hotkeyUses } from '../settings/hotkey-fields'

const failed = shallowRef<string[]>([])
// Normalised key → what it does in the game. A note on that hotkey, not a
// warning on the rail: taking a game key can be exactly what you meant.
const poeBinds = shallowRef<Map<string, string>>(new Map())
let listening = false

interface GameBind { hotkey: string, action: string }
function setPoeBinds (binds: GameBind[]) {
  poeBinds.value = new Map(binds.map(b => [normalizeKey(b.hotkey), b.action]))
}

function listen () {
  if (listening) return
  listening = true
  MainProcess.onEvent('MAIN->CLIENT::woke-event', ({ topic, data }) => {
    if (topic === 'hotkeys') failed.value = (data as { failed: string[] }).failed
    if (topic === 'game-binds') setPoeBinds(data as GameBind[])
  })
  hostRequest('hotkey-failures', null)
    .then(r => { failed.value = r.failed })
    .catch(() => {})
  ;(hostRequest('game-binds', null) as Promise<GameBind[]>)
    .then(binds => { if (binds.length) setPoeBinds(binds) })
    .catch(() => {})
}

export function useHotkeyHealth () {
  listen()
  const fields = computed(() => hotkeyFields(AppConfig()))
  const clashKeys = computed(() => {
    const uses = hotkeyUses(fields.value)
    const shown = new Map<string, string>()
    for (const f of fields.value) {
      const k = fieldKey(f)
      if (!k || f.off) continue
      const norm = normalizeKey(k)
      if ((uses.get(norm)?.length ?? 0) > 1 && !shown.has(norm)) shown.set(norm, k)
    }
    return [...shown.values()]
  })
  const failedNorm = computed(() => new Set(failed.value.map(normalizeKey)))
  const problems = computed(() => clashKeys.value.length + failed.value.length)
  const summary = computed(() => {
    const parts: string[] = []
    if (clashKeys.value.length) parts.push(`Same key on two actions: ${clashKeys.value.join(', ')}`)
    if (failed.value.length) parts.push(`Held by another program: ${failed.value.join(', ')}`)
    return parts.join('. ')
  })
  return { failed, failedNorm, poeBinds, problems, summary }
}
