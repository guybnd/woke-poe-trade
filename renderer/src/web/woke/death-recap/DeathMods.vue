<template>
  <div class="flex items-center gap-2" :class="$style.head">
    <span class="w-head-font w-accent flex-1">Mods</span>
    <span v-if="run?.match === 'screen'" :class="[$style.tag, $style.exact]" title="Read from the game's mod list while you were in this map">From screen</span>
    <span v-else-if="run?.match === 'exact'" :class="[$style.tag, $style.exact]" :title="checkedText">Exact</span>
    <span v-else-if="run?.match === 'likely'" :class="[$style.tag, $style.likely]" :title="checkedText">
      Likely{{ (run.candidates ?? 1) > 1 ? `, 1 of ${run.candidates}` : '' }}
    </span>
    <span v-else :class="[$style.tag, $style.unknown]">Unknown</span>
  </div>
  <template v-if="run?.mods">
    <!-- The rating is the chip (WRateChip, the same on every screen); the row itself takes no click. -->
    <div v-for="mod in rated" :key="mod.matcher"
      :class="[$style.mod, { 'w-dim': mod.rating === 'ok' }]" data-death-mod>
      <WRateChip :rating="mod.rating" :clickable="!!config" :save-to="profileName" @rate="rate(mod, $event)" />
      <span v-mod-tip="{ head: 'Map mod', text: mod.text, notes: [RATE_TITLE[mod.rating]] }" class="flex-1 text-left">{{ mod.text }}</span>
    </div>
    <div v-for="text in run.unknown" :key="text" :class="$style.mod" class="w-dim">
      <span :class="$style.gap" />
      <span v-mod-tip="{ head: 'Map mod', text, notes: ['Not a mod this list knows, so it has no rating'] }" class="flex-1">{{ text }} <span class="w-faint">(not recognised)</span></span>
    </div>
    <div v-if="run.match === 'likely'" :class="$style.note">{{ likelyNote }}</div>
  </template>
  <div v-else :class="$style.note">
    The game doesn't log a map's mods. Keep its mod list open at the top right to have them read,
    or press <WKbd :keys="hotkey" /> on a map before opening it.
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WKbd } from '../ui'
import { vModTip } from '../ui/tooltip/mod-line-tip'
import { findMapModsConfig } from '../map-mods/check'
import { activeProfile } from '../map-mods/widget'
import { fillRoll, modRatings, RATE_TITLE, setModRatings, withModRating } from '../map-mods/rules'
import WRateChip from '../ui/WRateChip.vue'
import type { CheckedMod, ModRating } from '../map-mods/rules'
import { rateSavedMods } from '../map-mods/data'
import { shortTime } from './death-log'
import type { RunRecord } from './death-log'

const props = defineProps<{ run: RunRecord | null }>()

const config = computed(() => findMapModsConfig())
const profileName = computed(() => config.value ? activeProfile(config.value).name : '')
const hotkey = computed(() => config.value?.hotkey ?? 'Alt + M')

const rated = computed(() => {
  const mods = props.run?.mods ?? []
  if (!config.value) return mods.map(m => ({ matcher: m.matcher, text: fillRoll(m.matcher, m.roll), rating: 'ok' as ModRating }))
  return rateSavedMods(mods, activeProfile(config.value))
})

const checkedText = computed(() => {
  const run = props.run
  return run?.checkedAt == null ? undefined : `Checked ${shortTime(run.at - run.checkedAt)} before you entered`
})

const likelyNote = computed(() => {
  const n = props.run?.candidates ?? 1
  return n > 1
    ? `You checked ${n} maps that fit. This is the last one checked before you entered, so it may not be the one you opened.`
    : `${checkedText.value ?? 'Checked a while before'}, so it may be another map of the same name.`
})

function rate (mod: CheckedMod, next: ModRating) {
  if (!config.value) return
  const profile = activeProfile(config.value)
  setModRatings(profile, 'maps', withModRating(modRatings(profile, 'maps'), mod.matcher, mod.wordings ?? [], next))
}
</script>

<style module>
.gap { flex: none; width: 3.4em; }
.head { padding: 8px var(--w-pad) 3px; }
.mod {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 3px var(--w-pad);
  text-align: left;
}
.tag {
  flex: none;
  padding: 0 6px;
  border-radius: var(--w-r-sm);
  font-size: 0.85em;
  font-weight: 600;
  white-space: nowrap;
}
.tag.exact { color: var(--w-up); background: color-mix(in srgb, var(--w-up) 14%, transparent); }
.tag.likely { color: var(--w-warn); background: color-mix(in srgb, var(--w-warn) 14%, transparent); }
.tag.unknown { color: var(--w-dim); background: var(--w-panel-3); }
.note {
  padding: 4px var(--w-pad);
  color: var(--w-dim);
  font-size: 0.9em;
  line-height: 1.45;
}
</style>
