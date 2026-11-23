// Start for a run, from the Runs view or the dock card: your Faustus listings
// are read first (what is listed now is from before the run), the costs typed
// for the same name last time come along, and what the last run left outside
// the stash is carried over (pick H1, not counted). A failed read still starts.
import { AppConfig } from '@/web/Config'
import { toast } from '../ui/layer'
import { leftOver } from './faustus'
import { readFaustus } from './faustus-read'
import { loadRuns, runsDoc, startRun } from './run-store'
import { loadSales, rates, sales } from './sales-store'
import type { LedgerPoint } from './ledger'
import type { CostLine, Run } from './runs'
import type { StashDiff } from './valuation'

type Extra = Pick<Run, 'startListings' | 'faustus' | 'carried' | 'carriedSales' | 'carriedFrom'>

// The costs typed for this name last time (without what was bought then).
export function lastCostsOf (name: string): CostLine[] {
  const n = name.trim() || 'Run'
  return (runsDoc.value.done.find(r => r.name === n)?.costs ?? []).map(c => { const x = { ...c }; delete x.bought; return x })
}

// The names of past runs, newest first.
export function pastRunNames (): string[] {
  return [...new Set(runsDoc.value.done.map(r => r.name))].filter(n => n !== 'Run')
}

let starting = false
// `at`: the read the run starts from. False when it didn't start.
export async function startRunAt (league: string, name: string, at: number, diffs: readonly StashDiff[], points: readonly LedgerPoint[], divine: number | null): Promise<boolean> {
  if (starting) return false
  // The league switched (the card's dynamic import can take a moment).
  const leagueNow = () => { const cur = AppConfig().leagueId; return !cur || cur === league }
  if (!leagueNow()) return false
  starting = true
  try {
    await loadRuns(league)
    await loadSales(league).catch(() => {})
    const runName = name.trim() || 'Run'
    const costs = lastCostsOf(runName)
    const doc = runsDoc.value
    const last = doc.live ?? doc.done[0]
    const taken = last && [doc.live, ...doc.done].some(r => r?.carriedFrom === last.id)
    let extra: Extra = last && !taken ? { ...leftOver(last, sales.value, rates.value), carriedFrom: last.id } : {}
    try {
      const read = await readFaustus(league, 0)
      const after = read.listings.filter(l => l.at > at)
      extra = { ...extra, startListings: read.listings.filter(l => l.at <= at).map(l => l.id), ...(after.length ? { faustus: { at: read.at, listings: after } } : {}) }
    } catch (e) {
      toast(`Started without your Faustus listings: ${(e as Error).message}`)
    }
    // The league switched meanwhile: the runs doc is the other league's now.
    if (!leagueNow()) return false
    await startRun(league, runName, at, diffs, points, divine, costs, extra)
    return true
  } finally { starting = false }
}
