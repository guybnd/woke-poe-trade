// Death recap's history: one JSON file for all leagues, kept out of config.json
// so a long list of deaths doesn't slow down every settings save.
// <userData>/woke-death-recap/deaths.json
import path from 'path'
import { dataDir, readJsonStrict, writeAtomic, writeQueue } from './data-files'
import type { WokeHandlers } from '../../../ipc/woke-ops'

const file = () => path.join(dataDir('woke-death-recap'), 'deaths.json')
const queued = writeQueue()

export const deathRecapHandlers: Partial<WokeHandlers> = {
  // A locked or damaged file throws (see readJsonStrict), so the overlay never
  // takes it for an empty history and saves over it.
  'death-recap-read': async () => {
    const saved = await readJsonStrict<{ deaths?: unknown, runs?: unknown }>(file(), {})
    return {
      deaths: Array.isArray(saved?.deaths) ? saved.deaths : [],
      runs: Array.isArray(saved?.runs) ? saved.runs : []
    }
  },
  'death-recap-write': async ({ deaths, runs }) => {
    if (!Array.isArray(deaths) || !Array.isArray(runs)) throw new Error('Death recap history is malformed.')
    return await queued(async () => {
      await writeAtomic(file(), JSON.stringify({ deaths, runs }))
      return true
    })
  }
}
