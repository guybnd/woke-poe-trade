// What each strategy earned, from Net worth's past runs: its run board
// (run-store.ts saveBoard), past runs grouped by name. A strategy matches the
// runs of the same name ("Strategy runs" in Net worth). No board (no runs yet): nothing shows.
import { computed, effectScope, shallowRef, watch } from 'vue'
import { AppConfig } from '@/web/Config'
import { hostRequest } from '../shared/host'
import { DOCS } from '../net-worth/glance'
import { isRunBoard, runBoardKey } from '../net-worth/runs'
import type { RunBoard } from '../net-worth/runs'
import { savedRunBoard } from '../net-worth/board-signal'
import { earningsFrom } from './earnings'
import { rateTime } from '../shared/rate-time-now'

const board = shallowRef<RunBoard | null>(null)
let asked = ''

function load (league: string | undefined) {
  asked = league ?? ''
  if (!league) { board.value = null; return }
  hostRequest('doc-get', { collection: DOCS, key: runBoardKey(league) })
    .then((b) => { if (asked === league) board.value = isRunBoard(b) && b.league === league ? b : null })
    .catch(() => {})
}

// Once, for as long as the app runs: the league's board on start and on a
// league change, and each board Net worth saves (a run stopped or edited).
let started = false
export function followRunBoard (): void {
  if (started) return
  started = true
  effectScope(true).run(() => {
    watch(() => AppConfig().leagueId, load, { immediate: true })
    watch(savedRunBoard, (b) => { if (b && b.league === asked) board.value = b })
  })
}

// By strategy name, per hour under the Per hour setting.
export const strategyEarnings = computed(() => earningsFrom(board.value, rateTime()))
