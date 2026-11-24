// Reads and saves the farming goal (goal.ts) on the Map mods window's config.
import { AppConfig } from '@/web/Config'
import { isModuleOn } from '../modules'
import type { FarmGoal } from './goal-chips'

// map-mods/widget.ts's MAP_MODS_TYPE; that file pulls in the UI.
const MAP_MODS_TYPE = 'woke-map-mods'

function widget (): { goal?: FarmGoal } | null {
  const config = AppConfig()
  if (!isModuleOn(config, 'map-mods')) return null
  return (config.widgets.find(w => w.wmType === MAP_MODS_TYPE) as { goal?: FarmGoal } | undefined) ?? null
}

export function farmGoal (): FarmGoal {
  const g = widget()?.goal
  return g === 'currency' || g === 'atlas' ? g : 'any'
}

export function setFarmGoal (goal: FarmGoal): void {
  const w = widget()
  if (w) w.goal = goal
}
