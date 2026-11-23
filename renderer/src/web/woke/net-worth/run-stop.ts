// Stop for the live run, from the Runs view or the dock card: your Faustus
// listings are read first (the summary's listed line), then the run stops at
// the moment Stop was pressed. The outside line needs sales: loaded here when
// the Runs view (which hands its own in) isn't open.
import { toast } from '../ui/layer'
import { outsideTotals } from './faustus'
import { readFaustus } from './faustus-read'
import { editRun, loadRuns, runsDoc, setOutside, stopRun } from './run-store'
import { loadSales, rates, sales } from './sales-store'
import type { LedgerPoint } from './ledger'

let stopping = false
export async function stopLiveRun (league: string, points: readonly LedgerPoint[], divine: number | null): Promise<void> {
  if (stopping) return
  stopping = true
  try {
    await loadRuns(league)
    const r = runsDoc.value.live
    if (!r || r.league !== league) return
    const at = Date.now()
    await loadSales(league).catch(() => {})
    try {
      const read = await readFaustus(league, r.startAt)
      await editRun(league, r.id, x => ({ ...x, faustus: read }), points, divine)
    } catch (e) { toast(`Stopped without your Faustus listings: ${(e as Error).message}`) }
    const was = setOutside((x) => { const o = outsideTotals(x, sales.value, rates.value); return { beforeChaos: o.beforeChaos, faustusChaos: o.faustusChaos } })
    try { await stopRun(league, points, divine, r.id, at) } finally { setOutside(was) }
  } finally { stopping = false }
}
