// The trade assistant's sales log: one JSON file per league in the app's user
// data folder, kept out of config.json so a league of trades doesn't slow
// down every settings save.
//
// Layout: <userData>/woke-trades/<league>.json  (an array of trades)
import path from 'path'
import { dataDir, leagueName, listDir, readJsonStrict, writeAtomic, writeQueue } from './data-files'

// Same as the renderer's TradeRecord (woke/trade/book.ts); kept loose here.
interface TradeRecord { id: string, league: string, at: number, [k: string]: unknown }

const root = () => dataDir('woke-trades')

function leagueFile (league: unknown): string {
  return path.join(root(), `${leagueName(league)}.json`)
}

// A league's trades (see readJsonStrict: a locked file throws, never reads as empty).
async function readFile (file: string): Promise<TradeRecord[]> {
  const list = await readJsonStrict<unknown>(file, [])
  return Array.isArray(list) ? list.filter((t): t is TradeRecord => t && typeof t.id === 'string') : []
}

const queued = writeQueue()

// Offers you dismissed or that ran out, kept until you remove them: one file for all
// leagues, newest last. <userData>/woke-offer-history/offers.json
interface OfferRecord { id: string, [k: string]: unknown }
const historyFile = () => path.join(dataDir('woke-offer-history'), 'offers.json')
async function readHistory (): Promise<OfferRecord[]> {
  const list = await readJsonStrict<unknown>(historyFile(), [])
  return Array.isArray(list) ? list.filter((o): o is OfferRecord => o && typeof o.id === 'string') : []
}

type Args = Record<string, unknown>

export const tradeLogHandlers: Record<string, (args: Args) => Promise<unknown>> = {
  'offer-history-list': async () => await readHistory(),
  'offer-history-add': async ({ offer }) => {
    const o = offer as OfferRecord
    if (!o || typeof o.id !== 'string') throw new Error('Offer has no id.')
    return await queued(async () => {
      const list = await readHistory()
      const i = list.findIndex(x => x.id === o.id)
      if (i >= 0) list[i] = o
      else list.push(o)
      await writeAtomic(historyFile(), JSON.stringify(list))
      return true
    })
  },
  // An offer replaced by a newer copy of itself, or removed from the history.
  'offer-history-delete': async ({ id }) => {
    return await queued(async () => {
      const list = await readHistory()
      const keep = list.filter(x => x.id !== id)
      if (keep.length !== list.length) await writeAtomic(historyFile(), JSON.stringify(keep))
      return true
    })
  },
  'trades-list': async () => {
    const names = await listDir(root())
    const out: TradeRecord[] = []
    for (const name of names) {
      if (!name.endsWith('.json')) continue
      // One unreadable league doesn't hide the others.
      try { out.push(...await readFile(path.join(root(), name))) } catch {}
    }
    return out
  },
  'trades-add': async ({ trade }) => {
    const t = trade as TradeRecord
    if (!t || typeof t.id !== 'string') throw new Error('Trade has no id.')
    return await queued(async () => {
      const file = leagueFile(t.league)
      const list = await readFile(file)
      const i = list.findIndex(x => x.id === t.id)
      if (i >= 0) list[i] = t
      else list.push(t)
      await writeAtomic(file, JSON.stringify(list))
      return true
    })
  },
  'trades-delete': async ({ id, league }) => {
    return await queued(async () => {
      const file = leagueFile(league)
      const list = await readFile(file)
      const keep = list.filter(x => x.id !== id)
      if (keep.length !== list.length) await writeAtomic(file, JSON.stringify(keep))
      return true
    })
  }
}
