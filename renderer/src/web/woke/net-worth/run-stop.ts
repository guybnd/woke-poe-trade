// Stop for the live run, from the Runs view or the dock card: your Faustus
// listings are read first (the summary's listed line), then the run stops at
// the moment Stop was pressed. The outside line needs sales: loaded here when
// the Runs view (which hands its own in) isn't open.
import { AppConfig } from '@/web/Config'
import { toast } from '../ui/layer'
import { outsideSums, outsideTotals } from './faustus'
import { readFaustus } from './faustus-read'
import { watch } from 'vue'
import { hostRequest } from '../shared/host'
import { editRun, lastRunReadAt, loadRuns, runReadSeen, runsDoc, setOutside, setPendingStop, stopPhase, stopRun, summaryFor } from './run-store'
import { loadSales, rates, sales } from './sales-store'
import type { LedgerPoint } from './ledger'
import type { Outside, Run } from './runs'

// One last stash read first, so what dropped since the last read counts
// (the run then ends at that read). A failed read stops on the last one.
// `points`: the chart's reads, read again after that final read.
// Resolves to the stopped run's id (null: nothing was stopped), and asks the
// Runs view to open its summary (summaryFor).
const COUNT_WAIT_MS = 30_000
let stopping = false
export async function stopLiveRun (league: string, points: () => readonly LedgerPoint[], divine: number | null): Promise<string | null> {
  if (stopping) return null
  stopping = true
  try {
    await loadRuns(league)
    const r = runsDoc.value.live
    if (!r || r.league !== league) return null
    const pressAt = Date.now()
    stopPhase.value = 'stash'
    const readAt = await finalRead(league)
    if (runsDoc.value.live?.id !== r.id) return null
    // The run ends at the final read when it was counted, else at the press
    // (the loot since the last counted read is missing either way).
    const at = Math.max(r.startAt, readAt ?? pressAt)
    setPendingStop({ id: r.id, at })
    stopPhase.value = 'listings'
    await loadSales(league).catch(() => {})
    try {
      const read = await readFaustus(league, r.startAt)
      await editRun(league, r.id, x => ({ ...x, faustus: read }), points(), divine)
    } catch (e) { toast(`Stopped without your Faustus listings: ${(e as Error).message}`) }
    // The league switched meanwhile: the runs doc is the other league's now.
    const cur = AppConfig().leagueId
    if (cur && cur !== league) { toast('League changed: the run was not stopped'); return null }
    const mine = (x: Run): Outside => outsideSums(outsideTotals(x, sales.value, rates.value))
    const was = setOutside(mine)
    try { await stopRun(league, points(), divine, r.id, at) } finally {
      // The Runs view opened or closed meanwhile: its hook stands.
      const now = setOutside(was)
      if (now !== mine) setOutside(now)
    }
    if (runsDoc.value.live?.id === r.id || !runsDoc.value.done.some(x => x.id === r.id)) return null
    summaryFor.value = { id: r.id, at: Date.now() }
    return r.id
  } finally { stopping = false; setPendingStop(null); stopPhase.value = null }
}

// Reads the stash and waits until Net worth has taken that read in
// (store.ts marks every read it handled, counted or not). Resolves to the
// read's time when it went into the run, else null (stop at the press).
const READ_WAIT_MS = 90_000
async function finalRead (league: string): Promise<number | null> {
  let readAt: number | null = null
  try {
    const s = await hostRequest('stash-reader-read', null, READ_WAIT_MS) as { lastReadAt?: number | null, league?: string | null, running?: boolean, error?: { message?: string } | null } | null
    if (s?.error) toast(`Stopped on the last stash read: ${s.error.message ?? 'the read failed'}`)
    else if (s?.league === league && !s.running) readAt = s.lastReadAt ?? null
  } catch (e) {
    toast(`Stopped on the last stash read: ${(e as Error).message}`)
  }
  if (readAt == null) return null
  if (runReadSeen.value < readAt) {
    const seen = readAt
    await new Promise<void>((resolve) => {
      const timer = setTimeout(done, COUNT_WAIT_MS)
      const off = watch(runReadSeen, (at) => { if (at >= seen) done() })
      function done () { clearTimeout(timer); off(); resolve() }
    })
  }
  return lastRunReadAt.value >= readAt ? readAt : null
}
