// Parses poe.ninja's per-league data dumps (https://poe.ninja/poe1/data).
// Each league zip holds `<League>.items.csv` and `<League>.currency.csv`:
//   items:    League;Date;Id;Type;Name;BaseType;Variant;Links;Value;Confidence
//   currency: League;Date;Get;Pay;Value;Confidence
// Values are in chaos, one row per item per day. We keep the first
// MAX_DAY + 1 days of each league, priced in divines (chaos inflates a lot
// during a league, so chaos prices would make everything look like it rises).

// League days kept (day 0 = first day in the dump = launch day).
export const MAX_DAY = 28

// Permanent leagues have no meaningful "league day".
const PERMANENT = new Set(['Standard', 'Hardcore'])

// Confidence per day: 2 high, 1 medium, 0 low, -1 no data.
export interface ItemHistory {
  type: string
  name: string
  // Left out when empty (the bundled leagues do).
  variant?: string
  links?: string
  // Built-in leagues hold these as Float64Array (NaN: no price) and Int8Array.
  div: Array<number | null>
  conf: number[]
}

export interface LeagueHistory {
  league: string
  start: string // YYYY-MM-DD, first date in the dump
  days: number // number of days with data (≤ MAX_DAY + 1)
  divine: Array<number | null> // Divine Orb price in chaos per league day
  imported: number // timestamp
  items: ItemHistory[]
}

interface RawRow {
  date: string
  type: string
  name: string
  variant: string
  links: string
  chaos: number
  conf: number
}

const CONFIDENCE: Record<string, number> = { Low: 0, Medium: 1, High: 2 }

function dayDiff (from: string, to: string): number {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000)
}

// Builds and saves every league the files hold. One that can't be used (its
// currency file is missing, say) doesn't stop the others.
export async function importLeagues (
  importer: Pick<DumpImporter, 'leagues' | 'build'>,
  save: (history: LeagueHistory) => Promise<void>,
  onLeague?: (league: string) => void
): Promise<{ imported: string[], failed: string[] }> {
  const imported: string[] = []
  const failed: string[] = []
  for (const league of importer.leagues()) {
    onLeague?.(league)
    try {
      await save(importer.build(league))
      imported.push(league)
    } catch (err) {
      failed.push((err as Error).message)
    }
  }
  return { imported, failed }
}

export function historyKey (item: { type: string, name: string, variant?: string, links?: string }): string {
  return `${item.type}\u0000${item.name}\u0000${item.variant ?? ''}\u0000${item.links ?? ''}`
}

// Collects rows from any number of dump CSV texts, grouped by league.
export class DumpImporter {
  private readonly rows = new Map<string, RawRow[]>()
  // league -> date -> Divine Orb price in chaos
  private readonly divine = new Map<string, Map<string, number>>()
  readonly skipped = new Set<string>()

  addCsv (text: string): void {
    const nl = text.indexOf('\n')
    if (nl === -1) return
    const header = text.slice(0, nl).trim().replace(/^\uFEFF/, '').split(';')
    const col = (name: string) => header.indexOf(name)
    const isCurrency = col('Get') !== -1 && col('Pay') !== -1
    const iLeague = col('League')
    const iDate = col('Date')
    const iValue = col('Value')
    const iConf = col('Confidence')
    if (iLeague === -1 || iDate === -1 || iValue === -1) {
      throw new Error('Not a poe.ninja dump file (missing League/Date/Value columns)')
    }
    const iGet = col('Get'); const iPay = col('Pay')
    const iType = col('Type'); const iName = col('Name'); const iVariant = col('Variant'); const iLinks = col('Links')

    let pos = nl + 1
    while (pos < text.length) {
      let end = text.indexOf('\n', pos)
      if (end === -1) end = text.length
      const line = text.slice(pos, end).replace(/\r$/, '')
      pos = end + 1
      if (!line) continue
      const f = line.split(';')
      const league = f[iLeague]
      if (!league) continue
      if (PERMANENT.has(league)) { this.skipped.add(league); continue }
      const chaos = Number(f[iValue])
      if (!Number.isFinite(chaos) || chaos <= 0) continue
      const date = f[iDate]
      const conf = iConf === -1 ? 0 : (CONFIDENCE[f[iConf]] ?? 0)

      if (isCurrency) {
        const get = f[iGet]; const pay = f[iPay]
        if (get === 'Divine Orb' && pay === 'Chaos Orb') {
          this.divineMap(league).set(date, chaos)
        } else if (get === 'Chaos Orb' && pay === 'Divine Orb') {
          const map = this.divineMap(league)
          if (!map.has(date)) map.set(date, 1 / chaos)
        }
        if (pay !== 'Chaos Orb' || get === 'Chaos Orb') continue
        this.push(league, { date, type: 'Currency', name: get, variant: '', links: '', chaos, conf })
      } else {
        this.push(league, {
          date,
          type: f[iType] ?? '',
          name: f[iName] ?? '',
          variant: iVariant === -1 ? '' : (f[iVariant] ?? ''),
          links: iLinks === -1 ? '' : (f[iLinks] ?? ''),
          chaos,
          conf
        })
      }
    }
  }

  leagues (): string[] {
    return Array.from(this.rows.keys())
  }

  build (league: string, minPeakChaos = 1): LeagueHistory {
    const rows = this.rows.get(league) ?? []
    let start = ''
    for (const r of rows) if (!start || r.date < start) start = r.date
    const divByDay = this.divineByDay(league, start)
    if (!divByDay.some(v => v != null)) {
      throw new Error(`${league}: no Divine Orb price found. Include ${league}.currency.csv.`)
    }

    const items = new Map<string, ItemHistory & { peak: number }>()
    let days = 0
    for (const r of rows) {
      const d = dayDiff(start, r.date)
      if (d < 0 || d > MAX_DAY) continue
      const divine = divByDay[d]
      if (divine == null) continue
      days = Math.max(days, d + 1)
      const key = historyKey(r)
      let item = items.get(key)
      if (!item) {
        item = {
          type: r.type,
          name: r.name,
          variant: r.variant,
          links: r.links,
          div: new Array<number | null>(MAX_DAY + 1).fill(null),
          conf: new Array<number>(MAX_DAY + 1).fill(-1),
          peak: 0
        }
        items.set(key, item)
      }
      item.div[d] = Number((r.chaos / divine).toPrecision(5))
      item.conf[d] = r.conf
      item.peak = Math.max(item.peak, r.chaos)
    }

    return {
      league,
      start,
      days,
      divine: divByDay,
      imported: Date.now(),
      items: Array.from(items.values())
        .filter(i => i.peak >= minPeakChaos)
        .map(i => ({ type: i.type, name: i.name, variant: i.variant, links: i.links, div: i.div, conf: i.conf }))
    }
  }

  private divineMap (league: string): Map<string, number> {
    let map = this.divine.get(league)
    if (!map) { map = new Map(); this.divine.set(league, map) }
    return map
  }

  private push (league: string, row: RawRow): void {
    let list = this.rows.get(league)
    if (!list) { list = []; this.rows.set(league, list) }
    list.push(row)
  }

  // Divine price per league day, gaps filled from the nearest known day.
  private divineByDay (league: string, start: string): Array<number | null> {
    const out = new Array<number | null>(MAX_DAY + 1).fill(null)
    for (const [date, chaos] of this.divine.get(league) ?? []) {
      const d = dayDiff(start, date)
      if (d >= 0 && d <= MAX_DAY && chaos >= 1) out[d] = chaos
    }
    for (let d = 0; d <= MAX_DAY; d++) {
      if (out[d] != null) continue
      for (let k = 1; k <= MAX_DAY; k++) {
        const near = out[d - k] ?? out[d + k]
        if (near != null) { out[d] = near; break }
      }
    }
    return out
  }
}
