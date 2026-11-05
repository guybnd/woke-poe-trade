<template>
  <transition
    enter-active-class="animate__animated animate__fadeIn"
    leave-active-class="animate__animated animate__backOutDown">
    <div :class="$style.widget" v-if="show">
      <div :class="$style.box" :style="{ '--mark': `url(${markUrl})` }">
        <div class="py-2 px-4">
          <div class="text-base">Woke PoE Trade</div>
          <p>{{ t('app_is_ready') }}</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Host } from '@/web/background/IPC'
import { AppConfig } from '@/web/Config'
import { appIconUrl } from '@/web/woke/ui/app-icon'

const { t } = useI18n()

const show = shallowRef(false)
const markUrl = computed(() => appIconUrl(AppConfig().appIcon))

Host.onEvent('MAIN->OVERLAY::overlay-attached', () => {
  if (!show.value && AppConfig().showAttachNotification) {
    show.value = true
    setTimeout(() => { show.value = false }, 2500)
  }
})
</script>

<style lang="postcss" module>
.widget {
  position: absolute;
  display: flex;
  width: 100%;
  justify-content: center;
  bottom: 20%;
}

.box {
  position: relative;
  display: flex;
  @apply bg-gray-800;
  @apply text-gray-100;
  @apply rounded;
  box-shadow: 0px 0px 1px 2px rgb(255 255 255 / 20%);
}

.box::before {
  position: absolute;
  content: '';
  background: var(--mark) no-repeat top right/contain;
  right: 100%;
  width: 100%;
  height: 100%;
  max-width: 78px;
  @apply mr-2;
  pointer-events: none;
  filter: drop-shadow(2px 4px 6px #000);
}
</style>
