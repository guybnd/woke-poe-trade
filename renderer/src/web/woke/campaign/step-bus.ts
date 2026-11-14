// The campaign card telling the run timer when a route step became current,
// so the run's timeline can keep when each step was finished.

export interface StepChange {
  // The step that is current now, and the one before the change.
  step: number
  prev: number
  // When (ms): the log line's time, or the click.
  at: number
  // The character the card follows ('' when not known yet).
  charName: string
  // Steps passed going forward (prev up to step - 1), now done.
  done: Array<{ index: number, text: string }>
}

const subs = new Set<(e: StepChange) => void>()

export function onStepChange (cb: (e: StepChange) => void): () => void {
  subs.add(cb)
  return () => { subs.delete(cb) }
}

export function emitStepChange (e: StepChange) {
  for (const cb of [...subs]) cb(e)
}
