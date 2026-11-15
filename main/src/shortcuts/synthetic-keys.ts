// woke: keys the app presses itself (see pressKeysToCopyItemText) reach every
// uIOhook listener as if the player pressed them. Listeners that react to a
// lone Alt press check this to skip the app's own presses.
let until = 0

export function markSyntheticKeys (ms = 250): void {
  until = Date.now() + ms
}

export function isSyntheticKeyWindow (): boolean {
  return Date.now() < until
}
