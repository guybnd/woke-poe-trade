<template>
  <img v-if="resolved.src && resolved.src !== failedSrc" :src="resolved.src" :alt="label" :title="label" :class="['w-game-icon', $style.icon]" :style="BOX[size]"
    loading="lazy" draggable="false" :ref="watchFail">
  <i v-else-if="resolved.fa" :class="[resolved.fa, $style.fa]" :style="BOX[size]" :title="label" />
  <span v-else :class="$style.blank" :style="BOX[size]" :title="label" />
</template>

<script lang="ts">
const BOX = Object.fromEntries((['sm', 'md', 'lg'] as const).map(s => [s, { width: `var(--w-icon-${s})`, height: `var(--w-icon-${s})` }]))
const onFail = new WeakMap<HTMLImageElement, () => void>()
if (typeof document !== 'undefined') {
  document.addEventListener('error', (e) => {
    if (!(e.target instanceof HTMLImageElement)) return
    onFail.get(e.target)?.()
    // A panel's crest icon (WPanel) is a plain image: a missing one just hides.
    if (e.target.classList.contains('w-crest-icon')) e.target.style.setProperty('display', 'none', 'important')
  }, true)
}
</script>

<script setup lang="ts">
// Game art for currency, items, gems and league mechanics (P18). Pass one of
// `currency`, `item` (+ `ns`), `mechanic` or a direct `src`. Sizes follow the
// icon grid: sm 16, md 20, lg 24. Falls back to a Font Awesome icon if the art
// is missing or fails to load, or an empty box of the same size so rows stay aligned.
import { computed, ref } from 'vue'
import type { BaseType } from '@/assets/data/interfaces'
import { CURRENCY_ICONS, gameIcon, mechanicIcon } from './game-icons'

const props = withDefaults(defineProps<{
  currency?: string
  item?: string
  ns?: BaseType['namespace']
  mechanic?: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
  title?: string
  fallback?: string
}>(), { currency: undefined, item: undefined, ns: 'ITEM', mechanic: undefined, src: undefined, size: 'sm', title: undefined, fallback: undefined })

// The src that failed to load; a new src gets its own try. A plain ref rather
// than a watcher per icon: there are hundreds of icons (perf budget).
const failedSrc = ref<string | null>(null)
// One shared listener for every icon on the page instead of one per icon: a
// load error doesn't bubble, but the document hears it while capturing.
function watchFail (el: unknown) {
  if (el instanceof HTMLImageElement) onFail.set(el, () => { failedSrc.value = el.getAttribute('src') })
}
const resolved = computed(() => {
  if (props.src) return { src: props.src, fa: props.fallback }
  if (props.currency) return { src: CURRENCY_ICONS[props.currency] ?? gameIcon(props.currency), fa: props.fallback }
  if (props.item) return { src: gameIcon(props.item, props.ns), fa: props.fallback }
  if (props.mechanic) { const m = mechanicIcon(props.mechanic); return { src: m.src, fa: props.fallback ?? m.fa } }
  return { src: null, fa: props.fallback }
})
const label = computed(() => props.title ?? props.item ?? props.currency ?? props.mechanic ?? '')
</script>

<style module>
.icon { display: inline-block; vertical-align: middle; }
.blank { display: inline-block; flex: none; }
/* Doubled so it beats Font Awesome's own display on .fas, which leaves the glyph in the box's top left. */
.fa.fa { display: inline-grid; place-items: center; font-size: calc(var(--w-icon-sm) * 0.75); color: var(--w-dim); flex: none; }
</style>
