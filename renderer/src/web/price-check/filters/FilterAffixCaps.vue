<template>
  <!-- woke: most prefixes / suffixes a listing may have, to find items with room to craft.
       Empty is any. Changing a cap only marks the results stale: it searches on Search. -->
  <span class="w-affix-caps" data-affix-caps>
    <span v-for="side in SIDES" :key="side.key"
      class="w-poe-nchip w-affix-cap" :class="{ on: caps[side.key] != null }"
      :data-affix-cap="side.key"
      :title="`Most ${side.what} a listing may have. Empty: any. Searches when you press Search.`"
      @wheel.prevent.stop="e => nudge(side.key, e.deltaY < 0 ? 1 : -1)">
      <button type="button" class="w-poe-nlab" :aria-pressed="caps[side.key] != null"
        @click="toggle(side.key)">{{ side.label }} <span class="w-sym">≤</span></button>
      <button type="button" class="w-poe-arr" tabindex="-1" aria-label="Fewer" @click="nudge(side.key, -1)">‹</button>
      <input class="w-poe-ninp" type="number" min="0" :max="caps.most - 1" :aria-label="`Most ${side.what}`"
        placeholder="–"
        :value="caps[side.key] ?? ''"
        @change="e => set(side.key, (e.target as HTMLInputElement).value)"
        @keydown.up.prevent="nudge(side.key, 1)"
        @keydown.down.prevent="nudge(side.key, -1)">
      <button type="button" class="w-poe-arr" tabindex="-1" aria-label="More" @click="nudge(side.key, 1)">›</button>
    </span>
  </span>
</template>

<script setup lang="ts">
import type { ItemFilters } from './interfaces'

type Caps = NonNullable<ItemFilters['affixCaps']>
type Side = 'prefix' | 'suffix'

const props = defineProps<{ caps: Caps }>()

const SIDES = [
  { key: 'prefix', label: 'Prefix', what: 'prefixes' },
  { key: 'suffix', label: 'Suffix', what: 'suffixes' }
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

// The label clears a cap; on an empty one it sets "one open".
function toggle (side: Side) {
  put(side, props.caps[side] == null ? props.caps.most - 1 : null)
}
</script>

<style>
.w-affix-caps { display: inline-flex; gap: 6px; align-items: center; white-space: nowrap; }
/* The standard layout has no chip styles of its own: a plain bordered box. */
#price-window:not(.w-poe) .w-affix-cap {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 0 2px 0 6px;
  border: 1px solid var(--w-chip-line);
  border-radius: 3px;
  color: var(--w-dim);
  font-size: .85em;
}
#price-window:not(.w-poe) .w-affix-cap.on { color: var(--w-fg); }
#price-window:not(.w-poe) .w-affix-cap input {
  width: 2.2ch;
  text-align: center;
  background: transparent;
  -moz-appearance: textfield;
}
.w-affix-cap input::-webkit-inner-spin-button,
.w-affix-cap input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.w-affix-cap .w-poe-ninp { width: 2.2ch; cursor: text; }
.w-affix-cap .w-poe-nlab { padding-right: 3px; }
</style>
