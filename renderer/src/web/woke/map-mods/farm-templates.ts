// Farming templates (Guy's pick F, 2026-11-24): what you farm, saved from the
// map strip's current picks and offered as a Farming button beside Currency,
// Maps & Threads and Any. A template keeps which number tiles are on, how close
// each min sits to the map's own value, the map kind, and the mods set to Not.
// Saved on the Map mods window's config; the last one picked is used for the
// next maps, like the built-in goals (goal-config.ts).
import { AppConfig } from '@/web/Config'
import { isModuleOn } from '../modules'

export interface FarmTemplate {
  id: string
  name: string
  // Number tile labels (check.ts) that start on.
  on: string[]
  // The min as a percent of the map's own value, for the map's own numbers.
  minPct?: Record<string, number>
  // The min for numbers the map hasn't got (added with +).
  extraMin?: Record<string, number>
  // The kind menu's choice: 'own' (the map's own kind), 'any', or a choice key.
  kind?: string
  // Map mods (their stat refs) set to Not.
  not?: string[]
}

interface Holder { farmTemplates?: FarmTemplate[], farmTemplate?: string }

// map-mods/widget.ts's MAP_MODS_TYPE; that file pulls in the UI.
const MAP_MODS_TYPE = 'woke-map-mods'

function widget (): Holder | null {
  const config = AppConfig()
  if (!isModuleOn(config, 'map-mods')) return null
  return (config.widgets.find(w => w.wmType === MAP_MODS_TYPE) as Holder | undefined) ?? null
}

export function farmTemplates (): FarmTemplate[] {
  const list = widget()?.farmTemplates
  return Array.isArray(list) ? list : []
}

// The template in use, or null for a built-in goal.
export function activeTemplate (): FarmTemplate | null {
  const id = widget()?.farmTemplate
  return id ? farmTemplates().find(t => t.id === id) ?? null : null
}

export function setActiveTemplate (id: string | null): void {
  const w = widget()
  if (!w) return
  if (id) w.farmTemplate = id
  else delete w.farmTemplate
}

export function saveTemplate (t: Omit<FarmTemplate, 'id'>): FarmTemplate | null {
  const w = widget()
  if (!w) return null
  const saved: FarmTemplate = { ...t, id: `t${Date.now().toString(36)}` }
  // Saving under a name already used replaces that one.
  w.farmTemplates = [...farmTemplates().filter(o => o.name !== t.name), saved]
  w.farmTemplate = saved.id
  return saved
}

export function deleteTemplate (id: string): void {
  const w = widget()
  if (!w) return
  w.farmTemplates = farmTemplates().filter(t => t.id !== id)
  if (w.farmTemplate === id) delete w.farmTemplate
}

// A short name not used yet: "Farm 1", "Farm 2"...
export function nextTemplateName (): string {
  const names = new Set(farmTemplates().map(t => t.name))
  let n = 1
  while (names.has(`Farm ${n}`)) n++
  return `Farm ${n}`
}

// The min a template sets on a map's own number: its percent of the map's value.
export function templateMin (pct: number, value: number): number {
  return Math.max(0, Math.min(value, Math.round(value * pct / 100)))
}
