// Item art from poe.ninja for categories the game data has no art for yet
// (3.30 Viscera): public/data/league/ninja-icons.json, built by
// scripts/build-ninja-icons.mjs. Read only when such a category is on screen.
import { shallowRef } from 'vue'
import { dataFileUrl, onSharedDataChange } from '../app/live-data'

const PREFIX = 'https://web.poecdn.com/gen/image/'

// Types with art in the file; others never trigger a read.
export const NINJA_ICON_TYPES = new Set(['Viscera'])

const icons = shallowRef<Record<string, Record<string, string>> | null>(null)
let job: Promise<void> | null = null
onSharedDataChange(() => { job = null; icons.value = null })

function load (): void {
  job ??= fetch(dataFileUrl('league/ninja-icons.json'))
    .then(res => res.ok ? res.json() : Promise.reject(new Error(`ninja-icons.json: ${res.status}`)))
    .then((data: Record<string, Record<string, string>>) => { icons.value = data })
    .catch((e) => {
      console.warn('[market] No poe.ninja art', e)
      job = null
    })
}

// Reactive: undefined until the file is read, then the item's art if listed.
export function ninjaArt (type: string, name: string): string | undefined {
  if (!NINJA_ICON_TYPES.has(type)) return undefined
  if (!icons.value) { load(); return undefined }
  const path = icons.value[type]?.[name]
  return path ? PREFIX + path : undefined
}
