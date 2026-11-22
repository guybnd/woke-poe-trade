<template>
  <widget :config="config" :hideable="false" :removable="false" readonly move-handles="corners">
    <woke-tab-bar :config="config" @paste="handleItemPaste" />
  </widget>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { WidgetMenu, WidgetSpec } from './interfaces'
import { Host } from '@/web/background/IPC'
import Widget from './Widget.vue'
// woke: the bar itself (tools, pins, right-click menu, launcher) lives in woke/.
import WokeTabBar from '@/web/woke/tab-bar/TabBar.vue'

export default defineComponent({
  widget: {
    type: 'menu',
    instances: 'single',
    initInstance: (): WidgetMenu => {
      return {
        wmId: 0,
        wmType: 'menu',
        wmTitle: '',
        wmWants: 'show',
        wmZorder: 1,
        wmFlags: ['invisible-on-blur', 'menu::skip'],
        anchor: {
          pos: 'tl',
          x: 5,
          y: 5
        },
        alwaysShow: false
      }
    }
  } satisfies WidgetSpec,
  components: { Widget, WokeTabBar },
  props: {
    config: {
      type: Object as PropType<WidgetMenu>,
      required: true
    }
  },
  setup () {
    return {
      handleItemPaste (text: string, from: DOMRect) {
        Host.selfDispatch({
          name: 'MAIN->CLIENT::item-text',
          payload: {
            clipboard: text,
            position: {
              x: window.screenX + from.x + from.width / 2,
              y: window.screenY + from.y + from.height / 2
            },
            focusOverlay: true,
            target: 'price-check',
            // woke: a pasted item wants listings, like a menu's Price check.
            live: true
          }
        })
      }
    }
  }
})
</script>
