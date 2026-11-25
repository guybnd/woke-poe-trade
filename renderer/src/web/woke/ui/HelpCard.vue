<template>
  <Teleport to="body">
    <div v-if="tip" ref="el" data-w-popup :class="[$style.card, { [$style.keysOnly]: !paragraphs.length }]" :style="pos" role="tooltip">
      <template v-if="tip.lines">
        <p v-for="(p, i) in paragraphs" :key="i" :class="[$style.lines, { [$style.more]: i > 0 }]">{{ p }}</p>
      </template>
      <template v-for="(b, i) in blocks" v-else :key="i">
        <p v-if="b.k === 'p'" :class="i === 0 ? $style.lead : [$style.next, $style.after]"><HelpInlines :parts="b.parts" /></p>
        <ul v-else :class="[$style.list, { [$style.next]: i > 0 }]">
          <li v-for="(item, j) in b.items" :key="j"><HelpInlines :parts="item" /></li>
        </ul>
      </template>
      <div v-if="tip.keys?.length" :class="[$style.keys, { [$style.more]: paragraphs.length }]">
        <template v-for="(k, i) in tip.keys" :key="i"><WKbd :keys="k.keys" /><span>{{ k.label }}</span></template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// Mounted once in the overlay. Draws the card behind a WInfo "?".
import { computed, defineComponent, h, inject, nextTick, onMounted, onUnmounted, ref, watch, type PropType } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { helpBlocks, helpParagraphs, helpTip as tip, hideHelp, placeHelp, type HelpInline } from './help-tip'
import WKbd from './WKbd.vue'

// Bold names and boxed keys inside a line (see helpBlocks).
const HelpInlines = defineComponent({
  props: { parts: { type: Array as PropType<HelpInline[]>, required: true } },
  setup: (props) => () => props.parts.map(p => p.k === 'b' ? h('b', p.v) : p.k === 'kbd' ? h(WKbd, { keys: p.v }) : p.v)
})

const el = ref<HTMLElement | null>(null)
const placed = ref<{ left: number, top: number } | null>(null)
const paragraphs = computed(() => helpParagraphs(tip.value?.text ?? ''))
const blocks = computed(() => tip.value?.lines ? [] : helpBlocks(tip.value?.text ?? ''))

watch(tip, async (t) => {
  placed.value = null
  if (!t) return
  await nextTick()
  const card = el.value
  if (!card || tip.value !== t) return
  // With CSS zoom, left and top are in zoomed units.
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--w-ui-scale')) || 1
  const r = card.getBoundingClientRect()
  const at = placeHelp(t.anchor, r, { width: window.innerWidth, height: window.innerHeight })
  placed.value = { left: at.left / scale, top: at.top / scale }
})

const pos = computed(() => placed.value
  ? { left: `${placed.value.left}px`, top: `${placed.value.top}px` }
  : { left: '0', top: '0', visibility: 'hidden' as const })

// It sits outside the panel, so nothing hides it with the panel, and the overlay
// gets no mouse events once the game has focus: closing the overlay mid-hover
// must not leave it over the game. A scroll moves the "?" away from under it.
const close = () => { hideHelp() }
const wm = inject<WidgetManager | undefined>('wm', undefined)
watch(() => wm?.active.value, close)
onMounted(() => {
  window.addEventListener('blur', close)
  window.addEventListener('scroll', close, true)
  window.addEventListener('dragstart', close, true)
})
onUnmounted(() => {
  window.removeEventListener('blur', close)
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('dragstart', close, true)
  close()
})
</script>

<style module>
.lines { white-space: pre-line; }
.card {
  position: fixed; z-index: 1002; zoom: var(--w-ui-scale, 1);
  width: 300px; padding: 8px 10px; pointer-events: none;
  background: var(--w-tip-bg); border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm);
  box-shadow: var(--w-shadow); color: var(--w-fg);
  font-size: var(--w-fs-sm); font-weight: 400; line-height: 1.45; white-space: normal; text-align: left;
}
.card p { margin: 0; }
.keysOnly { width: max-content; max-width: 300px; }
.keys { display: grid; grid-template-columns: auto auto; gap: 4px 8px; align-items: center; }
.more { margin-top: 6px !important; color: var(--w-dim); }
/* Lead line and bullets in full colour; later paragraphs (notes, credits) dimmer, as before. Names in bold. */
.lead { color: var(--w-fg); }
.next { margin-top: 5px !important; }
.after { color: var(--w-dim); }
.card b { font-weight: 600; color: var(--w-fg); }
.list { margin: 0; padding: 0; list-style: none; display: grid; gap: 3px; }
.list li { position: relative; padding-left: 12px; }
.list li::before {
  content: ''; position: absolute; left: 2px; top: 0.62em; width: 4px; height: 4px;
  background: var(--w-accent); transform: rotate(45deg); opacity: 0.8;
}
.card :global(kbd) { vertical-align: 1px; }
</style>
