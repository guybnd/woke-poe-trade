// Request/response calls to woke handlers in the main process (main/src/woke).
import { MainProcess } from '@/web/background/IPC'
import type { WokeArgs, WokeOp, WokeResult } from '@ipc/woke-ops'

// Random start: responses are broadcast, so ids must not clash between clients.
let nextId = Math.floor(Math.random() * 1e9)
const pending = new Map<number, { resolve: (v: unknown) => void, reject: (e: Error) => void }>()
let listening = false

function listen () {
  if (listening) return
  listening = true
  MainProcess.onEvent('MAIN->CLIENT::woke-response', ({ id, ok, data, error }) => {
    const req = pending.get(id)
    if (!req) return
    pending.delete(id)
    if (ok) req.resolve(data)
    else req.reject(new Error(error ?? 'Request failed'))
  })
}

// The op's args and result come from ipc/woke-ops.ts.
export function hostRequest<K extends WokeOp> (op: K, args: WokeArgs<K>, timeoutMs = 30_000): Promise<WokeResult<K>> {
  listen()
  const id = nextId++
  return new Promise<WokeResult<K>>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error('The app did not respond'))
    }, timeoutMs)
    pending.set(id, {
      resolve: (v) => { clearTimeout(timer); resolve(v as WokeResult<K>) },
      reject: (e) => { clearTimeout(timer); reject(e) }
    })
    MainProcess.sendEvent({ name: 'CLIENT->MAIN::woke-request', payload: { id, op, args } })
  })
}
