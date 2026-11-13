<template>
  <span :class="$style.wrap" data-price-style @keydown.esc.stop="open = false">
    <button :class="[$style.btn, { [$style.btnOn]: open }]" title="Look and filter layout" aria-label="Look and filter layout"
      :aria-expanded="open" @click="open = !open"><i class="fas fa-palette" /></button>
    <template v-if="open">
      <div :class="$style.backdrop" @mousedown.stop="open = false" />
      <div :class="$style.pop" role="dialog" aria-label="Look and filter layout" @mousedown.stop>
        <div :class="$style.head">Look</div>
        <div :class="$style.looks">
          <button v-for="t in WOKE_LOOKS" :key="t.id" :class="[$style.look, { [$style.on]: isLookPicked(t) }]"
            :title="t.hint" :aria-pressed="isLookPicked(t)" @click="pickLook(t)">
            <span :class="$style.swatch" :data-theme="t.id" />{{ t.label }}
          </button>
        </div>
        <div :class="$style.head">Filters</div>
        <div :class="$style.chips">
          <button v-for="l in LAYOUTS" :key="l.id" :class="[$style.chip, { [$style.on]: layout === l.id }]"
            :aria-pressed="layout === l.id" @click="setLayout(l.id)">{{ l.label }}</button>
        </div>
        <div :class="$style.note">The look changes every panel, not just the price check.</div>
      </div>
    </template>
  </span>
</template>

<script setup lang="ts">
// The price check's quick style switch (title bar palette): the theme, which sets
// the look of every panel, and Settings > Price check > Filter layout.
import { computed, shallowRef, watch } from 'vue'
import { AppConfig, saveConfig } from '@/web/Config'
import type { PriceCheckWidget } from '@/web/overlay/widgets'
import { WOKE_LOOKS, isLookPicked, pickLook } from '../ui'

type Layout = 'poe' | 'standard'
const LAYOUTS: Array<{ id: Layout, label: string }> = [
  { id: 'poe', label: 'Tooltip lines' },
  { id: 'standard', label: 'Rows' }
]

const open = shallowRef(false)
// The window only hides (v-show), so close the menu with it: a stale one would
// greet the next check with a backdrop that eats the first click.
watch(() => AppConfig<PriceCheckWidget>('price-check')?.wmWants, (wants) => {
  if (wants !== 'show') open.value = false
})
const layout = computed<Layout>(() =>
  AppConfig<PriceCheckWidget>('price-check')?.wokeWindowStyle === 'standard' ? 'standard' : 'poe')

function setLayout (id: Layout) {
  const widget = AppConfig<PriceCheckWidget>('price-check')
  if (!widget || layout.value === id) return
  widget.wokeWindowStyle = id
  saveConfig()
}
</script>

<style module>
.wrap { position: relative; display: inline-flex; margin-left: auto; }
/* Beats poe-mode.css's gold title bar buttons (:root[...] #price-window [data-price-title] > * > button). */
:global(:root) :global(#price-window) .wrap > .btn.btnOn { color: var(--w-accent); }
.backdrop { position: fixed; inset: 0; z-index: 40; }
.pop {
  position: absolute; right: 0; top: calc(100% + 4px); z-index: 41; box-sizing: border-box; width: 300px;
  display: grid; gap: 6px; padding: 8px 10px 10px; text-align: left; line-height: 1.3; cursor: default;
  background: var(--w-panel-solid-base); color: var(--w-fg); border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-md); box-shadow: 0 8px 24px rgb(0 0 0 / 0.6);
}
.head { font-size: var(--w-fs-sm); color: var(--w-dim); }
.looks { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; }
.look {
  display: flex; align-items: center; gap: 8px; padding: 4px 4px !important; border-radius: var(--w-r-sm);
  font-size: var(--w-fs-md); color: var(--w-fg); white-space: nowrap; background: none !important;
}
.look:hover { color: var(--w-accent); }
.chips { display: flex; gap: 4px; }
.chip {
  flex: 1 1 0; height: 26px; padding: 0 4px !important; border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm);
  font-size: var(--w-fs-sm); color: var(--w-fg); background: none !important;
}
.chip:hover { border-color: var(--w-accent); }
.chip.on { border-color: var(--w-accent); background: var(--w-accent-soft) !important; }
.look.on { color: var(--w-accent); }
.look.on .swatch { border-color: var(--w-accent); }
.note { font-size: var(--w-fs-xs); color: var(--w-faint); }
.swatch { width: 24px; height: 16px; flex: none; border-radius: 3px; border: 1px solid var(--w-line-strong); }
.swatch[data-theme="poe1"] { background: linear-gradient(135deg, #1a130a 55%, #c8a25a 55%); }
.swatch[data-theme="poe2"] { background: linear-gradient(135deg, #15110d 55%, #b8b0a0 55%); }
.swatch[data-theme="hybrid"] { background: linear-gradient(135deg, #13110f 55%, #d4a64a 55%); }
.swatch[data-theme="native"] { background: linear-gradient(135deg, #0e0b08 55%, #8a6a3a 55%); }
.swatch[data-theme="modern"] { background: linear-gradient(135deg, #111216 55%, #9aa8ff 55%); }
.swatch[data-theme="classic"] { background: linear-gradient(135deg, #1a202c 55%, #4a5568 55%); }
</style>
