import type { WokeModulesConfig } from '../modules'
import { markAllNewsSeen } from './news'

// Its own file: only the lazy dock menu and Look page use it, so it stays
// out of the startup JS (perf budget).
// Switching it off also marks every line seen, so switching it back on later
// shows only what came after.
export function setNewsOff (woke: WokeModulesConfig, off: boolean): void {
  if (off) markAllNewsSeen(woke)
  woke.newsOff = off || undefined
}
