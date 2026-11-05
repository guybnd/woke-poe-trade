// The active PoB build, read once and shared by every module that uses it
// (campaign card, PoB panel tabs, price check chip, loot filter rules).
import { computed, shallowRef, watch } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { AppConfig } from '@/web/Config'
import { isWidgetTypeOn } from '../modules'
import { CAMPAIGN_TYPE } from '../campaign/widget'
import type { CampaignWidget } from '../campaign/widget'
import { reportProblem } from '../dock/health'
import { POB_BUILDS_TYPE, pobApi } from './widget'
import type { PobBuildsWidget, PobDetails } from './widget'

export const useActiveBuild = createGlobalState(() => {
  const pobWidget = computed(() => {
    const cfg = AppConfig()
    if (!isWidgetTypeOn(cfg, POB_BUILDS_TYPE)) return undefined
    return cfg.widgets.find(w => w.wmType === POB_BUILDS_TYPE && (w as PobBuildsWidget).activeBuild) as PobBuildsWidget | undefined
  })
  const relPath = computed(() => pobWidget.value?.activeBuild ?? null)
  // Read through this, so every window agrees on the loadout in use.
  const loadout = computed(() => relPath.value ? pobWidget.value?.loadouts?.[relPath.value] : undefined)
  const details = shallowRef<PobDetails | null>(null)
  const error = shallowRef('')
  const version = shallowRef(0)

  // Character from the campaign tracker's Client.txt reading.
  const campaign = computed(() => AppConfig<CampaignWidget>(CAMPAIGN_TYPE)?.state)
  const level = computed(() => campaign.value?.level ?? null)
  const act = computed(() => campaign.value?.act ?? null)
  const charName = computed(() => campaign.value?.charName ?? '')
  // Class from Client.txt (ascendancy names work too), else the build's.
  const className = computed(() => campaign.value?.className || details.value?.ascendClassName || details.value?.className || '')

  watch(error, (err) => {
    reportProblem('pob-active-build', err ? `Can't read your active PoB build (${err}). Pick it again in PoB builds.` : null)
  })

  watch([relPath, version], async ([path]) => {
    error.value = ''
    if (!path || !pobWidget.value) { details.value = null; return }
    try {
      const d = await pobApi.read(pobWidget.value, path)
      if (relPath.value === path) details.value = d
    } catch (err) {
      // A build you already switched away from failing doesn't matter.
      if (relPath.value !== path) return
      // The file moved or was deleted; helpers just go quiet.
      details.value = null
      error.value = (err as Error).message
    }
  }, { immediate: true })

  return {
    pobWidget,
    relPath,
    loadout,
    details,
    error,
    level,
    act,
    charName,
    className,
    // Read the file again (after PoB saved it).
    reload: () => { version.value++ }
  }
})
