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
    <button v-for="mod in rated" :key="mod.matcher" type="button" :disabled="!config"
      :class="[$style.mod, { 'w-dim': mod.rating === 'ok' }]"
      :title="config ? `Click to change: ${RATING_LABEL[mod.rating]}` : undefined"
      data-death-mod @click="cycle(mod.matcher, mod.rating)">
      <span :class="[$style.dot, $style[mod.rating]]" />
      <span class="flex-1 text-left">{{ mod.text }}</span>
      <span v-if="mod.rating !== 'ok'" :class="[$style.tag, $style[mod.rating]]">{{ RATING_LABEL[mod.rating] }}</span>
    </button>
    <div v-for="text in run.unknown" :key="text" :class="$style.mod" class="w-dim">
      <span :class="$style.dot" />
      <span class="flex-1">{{ text }} <span class="w-faint">(not recognised)</span></span>
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
import { findMapModsConfig } from '../map-mods/check'
import { activeProfile } from '../map-mods/widget'
import { fillRoll, modRatings, nextModRating, rateMods, setModRatings, withRating } from '../map-mods/rules'
import type { ModRating } from '../map-mods/rules'
import { shortTime } from './death-log'
import type { RunRecord } from './death-log'

const props = defineProps<{ run: RunRecord | null }>()

const RATING_LABEL: Record<ModRating, string> = { deadly: "can't run", warn: 'careful', good: 'juice', ok: 'ok' }

const config = computed(() => findMapModsConfig())
const hotkey = computed(() => config.value?.hotkey ?? 'Alt + M')

const rated = computed(() => {
  const mods = props.run?.mods ?? []
  if (!config.value) return mods.map(m => ({ matcher: m.matcher, text: fillRoll(m.matcher, m.roll), rating: 'ok' as ModRating }))
  const profile = activeProfile(config.value)
  return rateMods(mods, { ...profile, ratings: modRatings(profile, 'maps') }).mods
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

function cycle (matcher: string, current: ModRating) {
  if (!config.value) return
  const profile = activeProfile(config.value)
  setModRatings(profile, 'maps', withRating(modRatings(profile, 'maps'), [matcher], nextModRating(current)))
}
</script>

<style module>
.head { padding: 8px var(--w-pad) 3px; }
.mod {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 3px var(--w-pad);
  text-align: left;
}
button.mod:not(:disabled):hover { background: var(--w-accent-soft); }
.dot {
  flex: none;
  width: 8px;
  height: 8px;
  margin-top: 0.4em;
  border-radius: 50%;
  background: var(--w-faint);
}
.dot.deadly { background: var(--w-down); }
.dot.warn { background: var(--w-warn); }
.dot.good { background: var(--w-up); }
.tag {
  flex: none;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
  white-space: nowrap;
}
.tag.exact, .tag.good { color: var(--w-up); background: color-mix(in srgb, var(--w-up) 14%, transparent); }
.tag.likely, .tag.warn { color: var(--w-warn); background: color-mix(in srgb, var(--w-warn) 14%, transparent); }
.tag.deadly { color: var(--w-down); background: color-mix(in srgb, var(--w-down) 14%, transparent); }
.tag.unknown { color: var(--w-dim); background: var(--w-panel-3); }
.note {
  padding: 4px var(--w-pad);
  color: var(--w-dim);
  font-size: 0.9em;
  line-height: 1.45;
}
</style>
