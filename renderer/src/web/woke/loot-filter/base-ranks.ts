// Our own base ranks (base-ranks.json, NeverSink retirement M2), seeded from
// NeverSink 8.21.1: the exotic bases worth about a divine or more (x1) and
// the rest (x2), and the three ranks of rare crafting bases (r1 best).
// Loaded with the filter (store.ts), so startup JS doesn't grow; empty until
// then.
export interface BaseRankTable { x1: string[], x2: string[], r1: string[], r2: string[], r3: string[] }

const EMPTY: BaseRankTable = { x1: [], x2: [], r1: [], r2: [], r3: [] }
let table: BaseRankTable | null = null
let loading: Promise<void> | null = null

export function loadBaseRanks (): Promise<void> {
  loading ??= import('./base-ranks.json').then(m => { table = m.default as BaseRankTable }).catch(() => { loading = null })
  return loading
}

export const baseRankTable = (): BaseRankTable => table ?? EMPTY
