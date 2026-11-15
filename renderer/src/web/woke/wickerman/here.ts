// The Viscera bosses drop in the zone you stand in, for the dock icon, the
// League mechanics card line and the Wickerman window. One table per app.
import { computed, onBeforeUnmount, shallowRef } from 'vue'
import type { ComputedRef, ShallowRef } from 'vue'
import { useZone } from '../shared/zone'
import { actFromAreaId } from '../campaign/log-parse'
import { onSharedDataChange } from '../app/live-data'
import { loadViscera, visceraHere } from './viscera'
import type { VisceraHere, VisceraTable } from './viscera'

const table = shallowRef<VisceraTable | null>(null)
let loading = false
// A data update makes a read still in flight stand down.
let generation = 0
function load () {
  if (table.value || loading) return
  loading = true
  const mine = generation
  loadViscera()
    .then(t => { if (mine === generation) table.value = t })
    .catch(() => {})
    .finally(() => { if (mine === generation) loading = false })
}
onSharedDataChange(() => { generation++; loading = false; table.value = null })

// Call from a component's setup: starts the zone tracker and the table read.
export function useVisceraTable (): ShallowRef<VisceraTable | null> {
  load()
  // A data update dropped the table: read it again while someone shows it.
  onBeforeUnmount(onSharedDataChange(() => { setTimeout(load, 0) }))
  return table
}

export function useVisceraHere (): { here: ComputedRef<VisceraHere[]>, zoneName: ComputedRef<string> } {
  const zone = useZone()
  const t = useVisceraTable()
  const here = computed(() => {
    if (!t.value || !zone.name || zone.kind === 'town' || zone.kind === 'hideout') return []
    return visceraHere(t.value, zone.name, actFromAreaId(zone.areaId))
  })
  return { here, zoneName: computed(() => zone.name) }
}
