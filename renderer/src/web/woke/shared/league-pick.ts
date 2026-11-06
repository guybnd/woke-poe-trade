// woke: which league to offer when a new one opens. The list is read once at
// launch (Leagues.ts); the leagues seen on earlier launches tell a new one apart.

const PERMANENT = ['Standard', 'Hardcore', '標準模式', '專家模式']

function isHardcore (id: string) {
  return id === 'Hardcore' || id === '專家模式' || id.startsWith('Hardcore ')
}

// A new league in the list, of the same kind (softcore or hardcore) as the one
// picked, that wasn't there on an earlier launch. Null before any launch was
// remembered: a first run has nothing to compare with.
export function newLeagueOffer (list: string[], known: string[] | undefined, selected: string | undefined): string | null {
  if (!known || !selected) return null
  const hardcore = isHardcore(selected)
  const fresh = list.find(id =>
    !known.includes(id) &&
    !PERMANENT.includes(id) &&
    isHardcore(id) === hardcore &&
    id !== selected)
  return fresh ?? null
}

// Leagues remembered across launches: what's listed now plus what was before,
// trimmed so a long-lived install doesn't grow it forever.
export function rememberLeagues (list: string[], known: string[] | undefined): string[] {
  const out = [...list]
  for (const id of known ?? []) if (!out.includes(id)) out.push(id)
  return out.slice(0, 40)
}

// Waits before trying the launch read again, after 1, 2, 3 failures and on.
const RETRY_MS = [60_000, 120_000, 300_000]
export function leagueRetryDelay (failures: number): number {
  return RETRY_MS[Math.min(Math.max(failures, 1), RETRY_MS.length) - 1]
}
