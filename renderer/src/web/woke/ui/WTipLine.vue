<template>
  <!-- A tip for a hidden gesture, at the foot of a window (shared/hints.ts).
       Gone the first time you use what it shows, or with ×. The probe tells
       whether the window is on screen: a hidden window (v-show) neither shows
       the tip nor spends its showings. -->
  <span ref="probe" :class="$style.probe" aria-hidden="true" />
  <div v-if="hint.show.value" :class="$style.tip" data-tip-line :data-hint="id" role="note">
    <span :class="$style.mark" aria-hidden="true">i</span>
    <span :class="$style.text"><slot /></span>
    <button type="button" :class="$style.close" title="Don't show this tip again" aria-label="Close tip" @click="hint.retire()">×</button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useHint } from '../shared/hints'

const props = defineProps<{ id: string, shows?: number }>()
const probe = shallowRef<HTMLElement>()
const onScreen = shallowRef(typeof IntersectionObserver === 'undefined')
let io: IntersectionObserver | undefined
onMounted(() => {
  if (onScreen.value || !probe.value) return
  io = new IntersectionObserver(entries => { onScreen.value = entries[entries.length - 1].isIntersecting })
  io.observe(probe.value)
})
onBeforeUnmount(() => io?.disconnect())
const hint = useHint(props.id, { shows: props.shows, when: () => onScreen.value })
</script>

<style module>
.probe { display: block; height: 0; overflow: hidden; }
.tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px var(--w-pad);
  border-top: 1px solid var(--w-line-strong);
  background: var(--w-panel-2);
  font-size: var(--w-fs-xs);
  color: var(--w-fg);
  line-height: 1.5;
}
.mark {
  flex: none;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 1px solid var(--w-accent);
  color: var(--w-accent);
  font-family: var(--w-head);
  font-weight: 700;
  font-size: var(--w-fs-xs);
  line-height: calc(13px * var(--w-text-scale, 1));
  text-align: center;
}
.text { min-width: 0; flex: 1 1 auto; }
.text :global(.w-kbd) { margin: 0 1px; }
.close {
  flex: none;
  color: var(--w-dim);
  font-size: var(--w-fs-md);
  line-height: 1;
  padding: 0 2px;
}
.close:hover { color: var(--w-fg); }
</style>
