import type { WokeModulesConfig } from '../modules'
import { markAllNewsSeen } from './news'

// Its own file: only the lazy dock menu and Look page use it, so it stays
// out of the startup JS (perf budget).
// Switching it off also marks every line seen, so switching it back on later
// shows only what came after.
// Switching it on also brings back the dock icon, if it was dismissed for
// good: a hidden icon counts as off too (newsIsOff).
export function setNewsOff (woke: WokeModulesConfig, off: boolean): void {
  if (off) markAllNewsSeen(woke)
  woke.newsOff = off || undefined
  if (!off && woke.dock?.hidden?.includes('whats-new')) woke.dock.hidden = woke.dock.hidden.filter(id => id !== 'whats-new')
}
