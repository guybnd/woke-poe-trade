import { useFold } from '../ui/fold'

// Whether the gem versions list is open: open unless folded, and it stays as
// left for the next gem (ui/fold). Its own key from before folds were shared
// ("woke.gemVersionsFolded" = "1" when folded) sets where it starts.
function legacyOpen (): boolean {
  try { return localStorage.getItem('woke.gemVersionsFolded') !== '1' } catch { return true }
}

export const gemVersionsOpen = useFold('gem-versions', legacyOpen())
