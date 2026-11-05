// Past-league data, shared by the panel and its settings page.
import { shallowRef } from 'vue'
import { DumpImporter, importLeagues } from './dumps'
import type { LeagueHistory } from './dumps'
import { allLeagues, deleteLeague, saveLeague } from './store'
import { readZip } from './zip'
import { toast } from '../ui'

export const histories = shallowRef<LeagueHistory[]>([])
export const historiesLoaded = shallowRef(false)
export const importing = shallowRef(false)
export const importMsg = shallowRef('')
export const importError = shallowRef(false)

export async function reloadHistories () {
  try { histories.value = await allLeagues() } catch { histories.value = [] }
  historiesLoaded.value = true
}

// Skip permanent, hardcore, Ruthless and SSF variants of a league.
function isWantedCsv (path: string): boolean {
  const name = path.split('/').pop() ?? path
  if (!/\.(items|currency)\.csv$/i.test(name)) return false
  return !/^(Standard|Hardcore|HC |Ruthless|SSF)/i.test(name)
}

export async function onFiles (e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return
  importing.value = true
  importError.value = false
  importMsg.value = 'Reading files…'
  try {
    const importer = new DumpImporter()
    for (const file of files) {
      if (file.name.toLowerCase().endsWith('.zip')) {
        for (const entry of readZip(await file.arrayBuffer())) {
          if (isWantedCsv(entry.name)) importer.addCsv(await entry.text())
        }
      } else if (isWantedCsv(file.name)) {
        importer.addCsv(await file.text())
      }
    }
    const names = importer.leagues()
    if (!names.length) throw new Error('No challenge league data found in these files.')
    const { imported, failed } = await importLeagues(importer, saveLeague, (name) => { importMsg.value = `Processing ${name}…` })
    importError.value = failed.length > 0
    importMsg.value = [imported.length ? `Imported ${imported.join(', ')}.` : '', ...failed].filter(Boolean).join(' ')
    await reloadHistories()
  } catch (err) {
    importError.value = true
    importMsg.value = (err as Error).message
  } finally {
    importing.value = false
  }
}

// No "are you sure": remove now, offer Undo (P9).
export async function removeHistory (h: LeagueHistory) {
  await deleteLeague(h.league)
  await reloadHistories()
  toast(`Removed ${h.league}`, {
    undo: () => { saveLeague(h).then(reloadHistories).catch(() => {}) }
  })
}
