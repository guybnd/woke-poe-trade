<template>
  <WPanel :title="result.name" size-key="verdict" width="26rem" max-height="80vh">
    <template #actions>
      <span class="w-dim text-xs whitespace-nowrap pr-2">{{ result.sub }}</span>
    </template>
    <div :class="[$style.verdict, isUnsure(result) ? $style.unknown : $style[result.verdict.verdict]]">
      <div :class="$style.badge">{{ isUnsure(result) ? '?' : VERDICT_LABEL[result.verdict.verdict] }}</div>
      <div class="flex flex-col min-w-0">
        <span :class="$style.headline">{{ headline }}</span>
        <span class="w-dim text-xs w-trunc">Profile: {{ profileName }}</span>
      </div>
    </div>
    <div v-if="result.juice" :class="$style.juice">
      <div class="flex items-baseline gap-2">
        <span class="w-group-label flex-1" style="padding: 0;">Juice</span>
        <span class="w-num w-accent" :class="$style.score">{{ result.juice.score }}</span>
        <span class="w-dim text-xs">/ 100 · {{ result.juice.label }}</span>
      </div>
      <div :class="$style.bar"><div :class="$style.fill" :style="{ width: result.juice.score + '%' }" /></div>
      <div v-if="result.props.length" :class="$style.props">
        <div v-for="p in result.props" :key="p.label" :class="$style.prop">
          <span class="w-dim">{{ p.label }}</span>
          <span class="w-num">+{{ p.value }}%</span>
        </div>
      </div>
    </div>
    <div class="w-group-label">Mods</div>
    <div v-if="!result.verdict.mods.length && !result.unknown.length" class="w-dim px-3 pb-2">No mods</div>
    <button v-for="(mod, i) in result.verdict.mods" :key="`${i}:${mod.matcher}`" type="button"
      :class="[$style.mod, { 'w-dim': mod.rating === 'ok' }]"
      :title="`Click to change: ${RATING_LABEL[mod.rating]}`"
      @click="cycle(mod.matcher, mod.rating)">
      <span :class="[$style.dot, $style[mod.rating]]" />
      <span class="flex-1 text-left">{{ mod.text }}</span>
      <span v-if="mod.rating !== 'ok'" :class="[$style.tag, $style[mod.rating]]">{{ RATING_LABEL[mod.rating] }}</span>
    </button>
    <div v-for="text in result.unknown" :key="text" :class="$style.mod" class="w-dim">
      <span :class="$style.dot" />
      <span class="flex-1">{{ text }} <span class="w-faint">(not recognised)</span></span>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WPanel } from '../ui'
import { heistRowOf } from './data'
import { modRatings, nextModRating, setModRatings, withRating } from './rules'
import type { ModRating, Verdict } from './rules'
import { activeProfile } from './widget'
import type { MapModsWidget } from './widget'
import { isUnsure } from './check'
import type { MapCheckResult } from './check'

const props = defineProps<{
  result: MapCheckResult
  config: MapModsWidget
}>()

const VERDICT_LABEL: Record<Verdict, string> = { skip: 'SKIP', careful: 'CARE', run: 'RUN' }
const RATING_LABEL: Record<ModRating, string> = { deadly: "can't run", warn: 'careful', good: 'juice', ok: 'ok' }

const profileName = computed(() => activeProfile(props.config).name)

const headline = computed(() => {
  if (props.result.unidentified) return "Not identified, so its mods aren't shown yet"
  const v = props.result.verdict
  if (v.deadly.length) return `${v.deadly.length} ${v.deadly.length === 1 ? "mod your build can't run" : "mods your build can't run"}`
  if (v.warn.length) return `${v.warn.length} ${v.warn.length === 1 ? 'mod' : 'mods'} to be careful with`
  const unread = props.result.unknown.length
  if (unread) return `${unread} ${unread === 1 ? "mod I couldn't read" : "mods I couldn't read"}, so check before you run it`
  return 'Safe for your build'
})

function cycle (matcher: string, current: ModRating) {
  const profile = activeProfile(props.config)
  const next = nextModRating(current)
  const mode = props.result.mode
  const key = mode === 'heist' ? heistRowOf(matcher) ?? matcher : matcher
  setModRatings(profile, mode, withRating(modRatings(profile, mode), [key], next))
}
</script>

<style module>
.verdict {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px var(--w-pad);
  border-bottom: 1px solid var(--w-line);
}
.badge {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: var(--w-r-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: var(--w-fs-md);
  color: var(--w-accent-fg);
}
.headline { font-weight: 600; }
.skip { background: color-mix(in srgb, var(--w-down) 12%, transparent); }
.skip .badge { background: var(--w-down); }
.skip .headline { color: var(--w-down); }
.careful { background: color-mix(in srgb, var(--w-warn) 10%, transparent); }
.careful .badge { background: var(--w-warn); }
.careful .headline { color: var(--w-warn); }
.unknown .badge { background: var(--w-panel-3); color: var(--w-dim); }
.run { background: color-mix(in srgb, var(--w-up) 10%, transparent); }
.run .badge { background: var(--w-up); }
.run .headline { color: var(--w-up); }

.juice {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px var(--w-pad);
  border-bottom: 1px solid var(--w-line);
}
.score { font-size: var(--w-fs-xl); font-weight: 600; }
.bar { height: 6px; border-radius: var(--w-r-sm); background: var(--w-panel-3); overflow: hidden; }
.fill { height: 100%; background: var(--w-accent); }
.props {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  font-size: var(--w-text-sm);
}
.prop {
  display: flex;
  flex-direction: column;
  padding: 4px 6px;
  border-radius: var(--w-r-sm);
  background: var(--w-panel-2);
}

.mod {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px var(--w-pad);
  text-align: left;
}
button.mod:hover { background: var(--w-accent-soft); }
.dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: var(--w-r-sm);
  background: var(--w-panel-3);
}
.dot.deadly { background: var(--w-down); }
.dot.warn { background: var(--w-warn); }
.dot.good { background: var(--w-up); }
.tag { font-size: var(--w-text-sm); white-space: nowrap; }
.tag.deadly { color: var(--w-down); }
.tag.warn { color: var(--w-warn); }
.tag.good { color: var(--w-up); }
</style>
