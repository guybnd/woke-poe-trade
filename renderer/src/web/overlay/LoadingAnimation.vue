<template>
  <transition :enter-from-class="$style.from" :leave-to-class="$style.gone">
    <div v-if="show" :class="$style.toast" role="status" data-woke-launch-toast>
      <div :class="$style.inner">
        <div :class="$style.plaque"><span :class="$style.title">Woke PoE Trade</span></div>
        <div :class="$style.line">Ready · <span :class="$style.key">{{ overlayKey }}</span> opens the overlay</div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
// The note shown once the app hooks onto the game (pick A, the title plaque):
// the windows' bronze plaque, top centre under the buff row, with the key
// that opens the overlay. It never takes the mouse and goes after 3 s.
import { computed, shallowRef } from 'vue'
import { Host } from '@/web/background/IPC'
import { AppConfig } from '@/web/Config'

const SHOW_MS = 3000

const show = shallowRef(false)
const overlayKey = computed(() => AppConfig().overlayKey)

Host.onEvent('MAIN->OVERLAY::overlay-attached', () => {
  if (!show.value && AppConfig().showAttachNotification) {
    show.value = true
    setTimeout(() => { show.value = false }, SHOW_MS)
  }
})
</script>

<style module>
/* Placed outside the zoom: CSS zoom would scale the vh too. */
.toast {
  position: absolute; z-index: 1002;
  top: 10vh; left: 0; right: 0;
  display: flex; justify-content: center;
  pointer-events: none;
  transition: opacity 400ms ease, transform 400ms ease;
}
.from { opacity: 0; transform: scale(0.97); transition-duration: 250ms; }
.gone { opacity: 0; }
@media (prefers-reduced-motion: reduce) { .from { transform: none; } }

.inner {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  zoom: var(--w-ui-scale, 1);
  white-space: nowrap;
}

/* Without the game's art (Modern, Classic, Simple): a plain dark box. */
.plaque {
  padding: 5px 14px;
  background: var(--w-panel-3); border: 1px solid var(--w-line-strong); border-radius: var(--w-r-md);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
}
.title {
  display: block;
  font-family: var(--w-head); letter-spacing: var(--w-head-track);
  font-size: 19px; line-height: 22px; color: var(--w-fg);
}

/* With PoE 1 or PoE 2 art: the windows' title plaque, the name on its face. */
:root[data-woke-art] .plaque {
  --face: 38px;
  box-sizing: border-box; height: 60px;
  min-width: calc(2 * var(--w-crest-cap) + var(--w-crest-min));
  padding: 0 calc(var(--w-crest-cap) + 14px);
  position: relative; isolation: isolate;
  border: 0; border-radius: 0; box-shadow: none; background: none;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.7));
}
/* Drawn as in poe-frame.css: the fill runs between the ends and a pixel under each. */
:root[data-woke-art] .plaque::before {
  content: ""; position: absolute; inset: 0; z-index: -1;
  box-sizing: border-box;
  padding: 0 calc(var(--w-crest-cap) - 1px);
  background:
    var(--art-crest-left) left top / auto 100% no-repeat,
    var(--art-crest-right) right top / auto 100% no-repeat,
    var(--art-crest-centre) center top / auto 100% no-repeat,
    var(--art-crest-fill-l) left top / 50% 100% no-repeat,
    var(--art-crest-fill-r) right top / 50% 100% no-repeat;
  background-origin: border-box, border-box, border-box, content-box, content-box;
  background-clip: border-box, border-box, border-box, content-box, content-box;
}
:root[data-woke-art="poe2"] .plaque { --face: 45px; }
/* PoE 2's plaque face is shorter than PoE 1's. */
:root[data-woke-art="poe2"] .title { font-size: 16px; }
:root[data-woke-art] .title {
  margin-top: calc(var(--face) - 11px);
  color: #e7d3a8;
  text-shadow: 0 1px 2px #000, 0 0 6px #000;
}

.line {
  font-family: var(--w-body); font-size: 15px; color: #c8b89a;
  text-shadow: 0 1px 2px #000, 0 0 6px #000;
}
.key { color: var(--w-gold-hi, var(--w-accent)); }
</style>
