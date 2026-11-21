<template>
  <div class="max-w-2xl p-2 flex flex-col gap-4" style="color: var(--w-fg);">
    <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
      <span>Hotkey: check hovered map</span>
      <w-hotkey-cell v-model="hotkey" />
      <span>Hotkey: paste map regex into stash search</span>
      <w-hotkey-cell v-model="regexHotkey" />
    </div>
    <label class="flex items-center gap-2">
      <input type="checkbox" v-model="stripOnPriceCheck">
      <span>Show the verdict strip on price check and item info</span>
    </label>

    <section v-if="scanOwner" class="flex flex-col gap-2" data-testid="map-scan-settings">
      <span class="w-group-label flex items-center gap-2" style="padding: 0;">Map scan <w-info text="Scan mode reads the tooltip of the map under your mouse with on-screen text recognition, so no key press is needed per map, and puts a verdict next to it from the active profile. Rerolling a map in place reads it again.&#10;&#10;Rolling mode locks onto one map's tooltip and re-reads only that box, for long reroll sessions.&#10;&#10;Start and stop it from the Scan tab of the Map mods window too. It needs Windows and the OCR files (Settings › Screen reading)." /></span>
      <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
        <span>Hotkey: scan mode on / off</span>
        <w-hotkey-cell v-model="scanHotkey" />
        <span>Hotkey: rolling mode (lock onto the hovered map)</span>
        <w-hotkey-cell v-model="scanRollHotkey" />
      </div>
      <label class="flex items-center gap-2">
        <input type="checkbox" v-model="scanAlertOnPass">
        <span>Flash when a reroll turns a map into a "run"</span>
      </label>
    </section>

    <section class="flex flex-col gap-2">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="w-group-label" style="padding: 0;">Profile</span>
        <WSelect :model-value="String(w.activeProfile)" :options="profileOptions"
          @update:model-value="w.activeProfile = Number($event)" />
        <WField :model-value="profile.name" placeholder="Profile name" :clear-on-esc="false"
          @update:model-value="profile.name = String($event)" />
        <WButton size="sm" icon="fas fa-plus" @click="addProfile">New</WButton>
        <WButton size="sm" icon="fas fa-copy" @click="copyProfile">Copy</WButton>
        <WButton v-if="w.profiles.length > 1" size="sm" variant="danger" icon="fas fa-trash" @click="removeProfile">Delete</WButton>
      </div>
      <div class="flex items-center gap-2 w-dim text-sm">How profiles work <w-info text="One profile per build. Rate mods and set rewards (minimums and juice weights) in the Map mods window. Maps, heist and charts each keep their own picks." /></div>
      <div v-if="dead.length" class="text-sm flex items-center gap-2 flex-wrap" style="color: var(--w-warn);">
        <span :title="dead.join('\n')">{{ dead.length }} rated {{ dead.length === 1 ? "mod isn't" : "mods aren't" }} in the game any more, so {{ dead.length === 1 ? 'it' : 'they' }} can't match a map.</span>
        <WButton size="sm" @click="removeDead">Remove</WButton>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <span class="w-group-label flex items-center gap-2" style="padding: 0;">Juice weights <w-info text="How much each stat counts toward the juice score. Set a stat to 0 to ignore it." /></span>
      <div class="grid gap-x-4 gap-y-2 items-center" style="grid-template-columns: auto 1fr auto;">
        <template v-for="key in WEIGHT_KEYS" :key="key">
          <span>{{ WEIGHT_LABELS[key] }}</span>
          <input type="range" min="0" max="2" step="0.1" :value="w.weights[key]"
            :aria-label="`${WEIGHT_LABELS[key]} weight`"
            @input="w.weights = { ...w.weights, [key]: Number(($event.target as HTMLInputElement).value) }">
          <span class="w-num w-dim">{{ w.weights[key].toFixed(1) }}</span>
        </template>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, watch } from 'vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import { configProp, configModelValue } from '@/web/settings/utils'
import { WButton, WField, WInfo, WSelect } from '../ui'
import { everyStatLine } from './data'
import { copyOfProfile, deadRatings } from './rules'
import type { JuiceWeights } from './rules'
import { activeProfile, normalizeMapModsWidget, MAP_MODS_TYPE } from './widget'
import type { MapModsWidget } from './widget'

const WEIGHT_KEYS: Array<keyof JuiceWeights> = ['quantity', 'rarity', 'packSize', 'currency', 'scarabs', 'maps', 'divCards']
const WEIGHT_LABELS: Record<keyof JuiceWeights, string> = {
  quantity: 'Atlas drops',
  rarity: 'Item rarity',
  packSize: 'Pack size',
  currency: 'More currency',
  scarabs: 'More scarabs',
  maps: 'More maps',
  divCards: 'More div cards'
}

export default defineComponent({
  name: 'Map mods',
  components: { WHotkeyCell, WButton, WField, WInfo, WSelect },
  props: configProp<MapModsWidget>(),
  setup (props) {
    // Normalize in a watcher, never inside a computed: writes from a computed
    // re-dirty it and loop. Pre-flush, so it runs before each render.
    watch(() => props.configWidget, normalizeMapModsWidget, { immediate: true })
    const w = computed(() => props.configWidget)
    const profile = computed(() => activeProfile(w.value))
    const dead = computed(() => deadRatings(profile.value.ratings, everyStatLine()))
    // Only the first Map mods window scans: its keys are the ones that work.
    const scanOwner = computed(() => props.configWidget.wmId === props.config.widgets.find(_ => _.wmType === MAP_MODS_TYPE)?.wmId)
    const profileOptions = computed(() => w.value.profiles.map(p => ({ value: String(p.id), label: p.name || 'Unnamed' })))

    function nextId () { return Math.max(0, ...w.value.profiles.map(p => p.id)) + 1 }

    return {
      w,
      profile,
      dead,
      removeDead () {
        const gone = new Set(dead.value)
        profile.value.ratings = Object.fromEntries(Object.entries(profile.value.ratings).filter(([m]) => !gone.has(m)))
      },
      profileOptions,
      scanOwner,
      WEIGHT_KEYS,
      WEIGHT_LABELS,
      hotkey: configModelValue(() => props.configWidget, 'hotkey'),
      regexHotkey: configModelValue(() => props.configWidget, 'regexHotkey'),
      stripOnPriceCheck: configModelValue(() => props.configWidget, 'stripOnPriceCheck'),
      scanHotkey: configModelValue(() => props.configWidget, 'scanHotkey'),
      scanRollHotkey: configModelValue(() => props.configWidget, 'scanRollHotkey'),
      scanAlertOnPass: configModelValue(() => props.configWidget, 'scanAlertOnPass'),
      addProfile () {
        const id = nextId()
        w.value.profiles = [...w.value.profiles, { id, name: `Build ${id}`, ratings: {}, mins: {}, highlight: 'good' }]
        w.value.activeProfile = id
      },
      copyProfile () {
        const id = nextId()
        w.value.profiles = [...w.value.profiles, copyOfProfile(profile.value, id)]
        w.value.activeProfile = id
      },
      removeProfile () {
        if (w.value.profiles.length <= 1) return
        const id = w.value.activeProfile
        w.value.profiles = w.value.profiles.filter(p => p.id !== id)
        w.value.activeProfile = w.value.profiles[0].id
      }
    }
  }
})
</script>
