// What each strategy earned, from Net worth's past runs: its run board
// (run-store.ts saveBoard), past runs grouped by name. A strategy matches the
// runs of the same name ("Strategy runs" in Net worth). No board (no runs yet): nothing shows.
import { computed, shallowRef } from 'vue'
import { AppConfig } from '@/web/Config'
import { hostRequest } from '../shared/host'
import { DOCS } from '../net-worth/glance'
import { isRunBoard, runBoardKey } from '../net-worth/runs'
import type { RunBoard } from '../net-worth/runs'
import { earningsFrom } from './earnings'
import { rateTime } from '../shared/rate-time-now'

const board = shallowRef<RunBoard | null>(null)
let asked = ''

// Reads the board again when the league changes or on `refresh` (a window opening).
export function loadRunBoard (refresh = false): void {
  const league = AppConfig().leagueId
  if (!league) { board.value = null; asked = ''; return }
  if (!refresh && asked === league) return
  asked = league
  hostRequest('doc-get', { collection: DOCS, key: runBoardKey(league) })
    .then((b) => { if (asked === league) board.value = isRunBoard(b) && b.league === league ? b : null })
    .catch(() => {})
}
// By strategy name, per hour under the Per hour setting.
export const strategyEarnings = computed(() => earningsFrom(board.value, rateTime()))
