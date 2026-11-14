<template>
  <!-- woke: most prefixes / suffixes a listing may have, to find items with room to craft.
       Empty is any. Changing a cap only marks the results stale: it searches on Search.
       Enter takes the typed number before PoE mode's Enter-to-search sees the key. -->
  <span class="w-affix-caps" data-affix-caps>
    <span v-for="side in SIDES" :key="side.key"
      class="w-poe-nchip w-affix-cap" :class="{ on: caps[side.key] != null }"
      :data-affix-cap="side.key"
      :title="`Most ${side.what} a listing may have. Empty: any. Click to step down, scroll or type. Searches when you press Search.`"
      @wheel.prevent.stop="e => nudge(side.key, e.deltaY < 0 ? 1 : -1)">
      <button type="button" class="w-poe-nlab" :aria-pressed="caps[side.key] != null"
        @click="step(side.key)">{{ side.label }} <span class="w-sym">≤</span></button>
      <input class="w-poe-ninp" type="number" min="0" :max="caps.most - 1" :aria-label="`Most ${side.what}`"
        placeholder="–"
        :value="caps[side.key] ?? ''"
        @change="e => set(side.key, (e.target as HTMLInputElement).value)"
        @keydown.enter="e => set(side.key, (e.target as HTMLInputElement).value)"
        @keydown.up.prevent="nudge(side.key, 1)"
        @keydown.down.prevent="nudge(side.key, -1)">
    </span>
  </span>
</template>

<script setup lang="ts">
import type { ItemFilters } from './interfaces'

type Caps = NonNullable<ItemFilters['affixCaps']>
type Side = 'prefix' | 'suffix'

const props = defineProps<{ caps: Caps }>()

const SIDES = [
  { key: 'prefix', label: 'Pre', what: 'prefixes' },
  { key: 'suffix', label: 'Suf', what: 'suffixes' }
] as const

// A cap at the item's ceiling (or above) caps nothing, so it reads as empty.
function put (side: Side, value: number | null) {
  props.caps[side] = (value == null || value >= props.caps.most) ? null : Math.max(0, value)
}

function set (side: Side, raw: string) {
  const n = raw.trim() === '' ? null : Math.floor(Number(raw))
  put(side, (n == null || Number.isNaN(n)) ? null : n)
}

// Empty sits above the highest cap: one step down from empty is "one open".
function nudge (side: Side, by: number) {
  const now = props.caps[side] ?? props.caps.most
  put(side, now + by)
}

// The label steps the cap down, one more open slot each click, then back to empty.
function step (side: Side) {
  const now = props.caps[side]
  put(side, now == null ? props.caps.most - 1 : now === 0 ? null : now - 1)
}
</script>

<style>
/* One face and size on the results bar and the Search row alike, so the caps don't
   move when one gives way to the other (the bar's own text is smaller). */
#price-window .w-affix-caps {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  white-space: nowrap;
  font-family: var(--w-label);
  font-size: var(--w-fs-md);
}
/* On the results bar: beside Matched, kept from shrinking. */
#price-window .w-pc-toolbar > .w-pc-caps { margin: 0 0 0 8px; flex: none; }
/* A small bordered box in either layout; PoE mode's chip colours win where they apply. */
#price-window .w-affix-caps .w-affix-cap {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 0 5px 0 6px;
  border: 1px solid var(--w-chip-line);
  border-radius: 3px;
  color: var(--w-dim);
  font-size: .85em;
}
#price-window .w-affix-caps .w-affix-cap.on { color: var(--w-fg); }
#price-window .w-affix-caps .w-affix-cap input {
  width: 1.6ch;
  min-width: 0;
  padding: 0;
  text-align: center;
  background: transparent;
  cursor: text;
  -moz-appearance: textfield;
}
.w-affix-cap input::-webkit-inner-spin-button,
.w-affix-cap input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
#price-window .w-affix-caps .w-poe-nlab { padding-right: 3px; }
</style>
