// Start for a run, from the Runs view or the dock card: your Faustus listings
// are read first (what is listed now is from before the run), the costs typed
// for the same name last time come along, and what the last run left outside
// the stash is carried over (pick H1, not counted). A failed read still starts.
import { AppConfig } from '@/web/Config'
import { toast } from '../ui/layer'
import { leftOver, startListingIds } from './faustus'
import { readFaustus } from './faustus-read'
import { loadRuns, runsDoc, startRun } from './run-store'
import { loadSales, rates, sales } from './sales-store'
import type { LedgerPoint } from './ledger'
import { addToTally } from './runs'
import type { CostLine, LivePrice, Run } from './runs'
import type { StashDiff } from './valuation'

type Extra = Pick<Run, 'startListings' | 'faustus' | 'carried' | 'carriedSales' | 'carriedFrom' | 'kind'>

// The costs typed for this name last time (without what was bought then):
// a map run's kit, never a crafting session's costs.
export function lastCostsOf (name: string): CostLine[] {
  const n = name.trim() || 'Run'
  return (runsDoc.value.done.find(r => r.name === n && r.kind !== 'craft')?.costs ?? []).map(c => { const x = { ...c }; delete x.bought; return x })
}

// The names of past runs, newest first.
export function pastRunNames (): string[] {
  return [...new Set(runsDoc.value.done.map(r => r.name))].filter(n => n !== 'Run')
}

// The last run with the reads between its Stop and this start: a sale
// collected or a held item stashed in between isn't carried over (else the
// next run's first arrival or drop would take it off that run's profit).
// Only its tally and arrivals grow; its own window stays.
export function withGap (last: Run, diffs: readonly StashDiff[], at: number): Run {
  const stop = last.stoppedAt
  if (stop == null) return last
  let r: Run = { ...last, stoppedAt: at }
  for (const d of [...diffs].filter(d => d.at > stop && d.at <= at).sort((a, b) => a.at - b.at)) r = addToTally(r, d)
  return { ...r, stoppedAt: stop }
}

let starting = false
// `at`: the read the run starts from. False when it didn't start.
// `kit`: the costs to start with (the Runs view's kit, changed before Start);
// default the last same-name run's. `price`: today's prices for its live lines.
// `kind`: 'craft' for a crafting session.
export async function startRunAt (league: string, name: string, at: number, diffs: readonly StashDiff[], points: readonly LedgerPoint[], divine: number | null, kit?: CostLine[], price?: LivePrice, kind?: 'craft'): Promise<boolean> {
  if (starting) return false
  // The league switched (the card's dynamic import can take a moment).
  const leagueNow = () => { const cur = AppConfig().leagueId; return !cur || cur === league }
  if (!leagueNow()) return false
  starting = true
  try {
    await loadRuns(league)
    await loadSales(league).catch(() => {})
    const runName = name.trim() || 'Run'
    const costs = kit ?? lastCostsOf(runName)
    const doc = runsDoc.value
    const last = doc.live ?? doc.done[0]
    const taken = last && [doc.live, ...doc.done].some(r => r?.carriedFrom === last.id)
    let extra: Extra = last && !taken ? { ...leftOver(withGap(last, diffs, at), sales.value, rates.value), carriedFrom: last.id } : {}
    // When the Listed doc first saw each listing: a read holds at most 100,
    // and an older listing's sale is from before the run too.
    const seen = await import('./pending-store')
      .then(async m => { await m.loadPending(league); return m.pendingDoc.value?.league === league ? m.pendingDoc.value.firstSeen : undefined })
      .catch(() => undefined)
    try {
      const read = await readFaustus(league, 0)
      // The same read keeps the Listed tab up to date (pending-store.ts).
      import('./pending-store').then(m => m.notePendingRead(league, read)).catch(() => {})
      const after = read.listings.filter(l => l.at > at)
      extra = { ...extra, startListings: startListingIds(read.listings, seen, at), ...(after.length ? { faustus: { at: read.at, listings: after } } : {}) }
    } catch (e) {
      toast(`Started without your Faustus listings: ${(e as Error).message}`)
      const before = startListingIds([], seen, at)
      if (before.length) extra = { ...extra, startListings: before }
    }
    // The league switched meanwhile: the runs doc is the other league's now.
    if (!leagueNow()) return false
    if (kind) extra = { ...extra, kind }
    await startRun(league, runName, at, diffs, points, divine, costs, extra, price)
    return true
  } finally { starting = false }
}
