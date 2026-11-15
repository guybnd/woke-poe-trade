<template>
  <transition :enter-active-class="$style.entering" :enter-from-class="$style.from" :leave-to-class="$style.gone">
    <div v-if="show" :class="$style.toast" role="status" data-woke-launch-toast>
      <div :class="$style.strip">
        <img :src="iconUrl" alt="" :class="$style.icon">
        <div :class="$style.text">
          <div :class="$style.name">Woke PoE Trade</div>
          <div>Ready · <span :class="$style.key">{{ overlayKey }}</span> opens the overlay</div>
          <div :class="$style.version" data-woke-launch-version>v{{ Host.version.value }}<template v-if="update"> · <span :class="$style.update">{{ update }}</span></template></div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
// The note shown once the app hooks onto the game (Guy's pick B, the stone
// strip): app icon, the key that opens the overlay, and the version with any
// update. Above the skill bar; it never takes the mouse and goes after 3 s.
import { computed, shallowRef } from 'vue'
import { Host } from '@/web/background/IPC'
import { AppConfig } from '@/web/Config'
import { appIconUrl } from '@/web/woke/ui/app-icon'

const SHOW_MS = 3000

const show = shallowRef(false)
const overlayKey = computed(() => AppConfig().overlayKey)
const iconUrl = computed(() => appIconUrl(AppConfig().appIcon))

// Follows the updater while the note is up: the check often ends after launch.
const update = computed(() => {
  const info = Host.updateInfo.value
  switch (info.state) {
    case 'update-downloaded': return `Update ${info.version} installs when you quit`
    case 'update-available': return info.noDownloadReason ? `Update ${info.version} available` : `Update ${info.version} downloading`
    case 'update-not-available': return 'Up to date'
    default: return null
  }
})

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
  bottom: 20vh; left: 0; right: 0;
  display: flex; justify-content: center;
  pointer-events: none;
  transition: opacity 400ms ease, transform 400ms ease;
}
.entering { transition-duration: 250ms; }
.from { opacity: 0; transform: translateY(10px); }
.gone { opacity: 0; transform: translateY(6px); }
@media (prefers-reduced-motion: reduce) { .from, .gone { transform: none; } }

/* Without the game's art (Modern, Classic, Simple): a plain dark box. */
.strip {
  zoom: var(--w-ui-scale, 1);
  display: flex; align-items: center; gap: 12px;
  padding: 8px 18px 8px 10px;
  white-space: nowrap;
  font-family: var(--w-body); font-size: calc(14px * var(--w-text-scale, 1)); line-height: 1.3; color: #c8b89a;
  background: var(--w-panel-3); border: 1px solid var(--w-line-strong); border-radius: var(--w-r-md);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
}
/* With PoE 1 or PoE 2 art: the game's stone with a bronze edge. */
:root[data-woke-art] .strip {
  background: var(--art-stone) center / cover;
  border-color: var(--w-frame); border-radius: 0;
  box-shadow: 0 0 0 1px #000, inset 0 1px 0 rgba(255, 226, 160, 0.08), 0 8px 24px rgba(0, 0, 0, 0.6);
}
.icon { width: 38px; height: 38px; flex: none; object-fit: contain; filter: drop-shadow(0 2px 3px #000); }
.text { display: flex; flex-direction: column; }
.name {
  font-family: var(--w-head); letter-spacing: var(--w-head-track);
  font-size: calc(18px * var(--w-text-scale, 1)); color: var(--w-gold, var(--w-fg));
}
.key { color: var(--w-gold-hi, var(--w-accent)); }
.version { color: var(--w-dim); font-variant-numeric: tabular-nums; }
.update { color: var(--w-gold-hi, var(--w-accent)); }
</style>
