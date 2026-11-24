// Imported first (by user-data.ts): an elevated copy started by "Restart as
// admin" (run-as-admin.ts) waits here for the copy that started it to quit,
// before any module reads a file, so only one copy runs and the old one's
// last config write lands first. No electron import: this runs before all.
import { AFTER_PID_ARG } from './after-pid'

export function afterPid (argv: string[]): number | null {
  const arg = argv.find(a => a.startsWith(AFTER_PID_ARG))
  const pid = arg ? Number(arg.slice(AFTER_PID_ARG.length)) : NaN
  return Number.isInteger(pid) && pid > 0 ? pid : null
}

const sleeper = new Int32Array(new SharedArrayBuffer(4))
const sleep = (ms: number) => { Atomics.wait(sleeper, 0, 0, ms) }

function running (pid: number) {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    // EPERM: it's there but not ours to signal.
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

const started = afterPid(process.argv)
if (started != null) {
  const until = Date.now() + 20_000
  while (Date.now() < until && running(started)) sleep(100)
}

// The single-instance lock, retried for a few seconds in a copy that waited:
// the old copy can still hold it for a moment after its process looks gone.
export function lockAfterWait (tryLock: () => boolean): boolean {
  if (tryLock()) return true
  if (started == null) return false
  const until = Date.now() + 10_000
  while (Date.now() < until) {
    sleep(250)
    if (tryLock()) return true
  }
  return false
}
