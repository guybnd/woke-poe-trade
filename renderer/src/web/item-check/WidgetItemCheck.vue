<template>
  <Widget :config="widgetConfig" move-handles="none" :removable="false" :hideable="!lookup" :inline-edit="false">
    <ItemLookup v-if="lookup" :key="lookupKey" :request="lookup" @close="closeLookup" />
    <template v-else-if="item">
      <!-- woke: Map mods replaces APT's map check. -->
      <WokeMapVerdictCard v-if="wokeMap"
        :result="wokeMap.result" :config="wokeMap.config" />
      <div v-else class="flex flex-col">
        <div v-if="wokeIsMapLike(item)" class="bg-gray-900 text-gray-400 text-sm px-2 py-1">Turn on Map mods in Settings to rate this.</div>
        <ItemInfo :item="item" />
      </div>
    </template>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '../overlay/interfaces'
import type { ItemCheckWidget } from './widget.js'

export default {
  widget: {
    type: 'item-check',
    instances: 'single',
    initInstance: (): ItemCheckWidget => {
      return {
        wmId: 0,
        wmType: 'item-check',
        wmTitle: '',
        wmWants: 'hide',
        wmZorder: 'exclusive',
        wmFlags: ['hide-on-blur', 'menu::skip'],
        hotkey: null,
        wikiKey: null,
        poedbKey: null,
        craftOfExileKey: null,
        stashSearchKey: null,
        bookmarksKey: null,
        bookmarks: [],
        maps: {
          profile: 1,
          showNewStats: false,
          selectedStats: [
            { matcher: 'Players have #% to all maximum Resistances', decision: 'w--' },
            { matcher: 'Monsters reflect #% of Physical Damage', decision: 'd--' },
            { matcher: 'Monsters reflect #% of Elemental Damage', decision: 'd--' },
            { matcher: 'Area contains two Unique Bosses', decision: 'g--' }
          ]
        }
      }
    }
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { parseClipboard, ParsedItem } from '@/parser'
import { registerActions } from './hotkeyable-actions'
import type { WidgetManager } from '../overlay/interfaces'
import type { Anchor } from '../overlay/widgets'

import Widget from '../overlay/Widget.vue'
import ItemInfo from './ItemInfo.vue'
import WokeMapVerdictCard from '@/web/woke/map-mods/MapVerdictCard.vue'
import ItemLookup from '@/web/woke/item-lookup/ItemLookup.vue'
import { lookupRequest as lookup } from '@/web/woke/item-lookup/lookup'
import { wokeMapCheck, ensureMapModsConfig, isMapLike as wokeIsMapLike } from '@/web/woke/map-mods/check'

const props = defineProps<{
  config: ItemCheckWidget
}>()

const wm = inject<WidgetManager>('wm')!

const checkPosition = ref({ x: 1, y: 1 })
const item = ref<ParsedItem | null>(null)

registerActions()

MainProcess.onEvent('MAIN->CLIENT::item-text', (e) => {
  if (e.target !== 'item-check') return

  // woke: a key pressed over nothing leaves a hidden page alone.
  const parsed = parseClipboard(e.clipboard).unwrapOr(null)
  if (!parsed && lookup.value) return
  lookup.value = null
  checkPosition.value = e.position
  item.value = parsed
  if (item.value) {
    wm.show(props.config.wmId)
  }
})

props.config.wmWants = 'hide'

// woke: the wiki, poedb and Craft of Exile keys open a page in this widget.
// Closing the overlay only hides an open page, like the price check browser,
// so the same page is back when the overlay opens again; the item info card
// still closes with the overlay. Closing the page, or a new check, ends it.
const lookupKey = ref(0)
watch(() => Boolean(lookup.value), (open) => {
  wm.setFlag(props.config.wmId, 'hide-on-blur', !open)
  wm.setFlag(props.config.wmId, 'invisible-on-blur', open)
}, { immediate: true })
watch(lookup, (request) => {
  if (!request) return
  lookupKey.value++
  if (request.position) checkPosition.value = request.position
  wm.show(props.config.wmId)
})
watch(() => props.config.wmWants, (wants) => {
  if (wants === 'hide') lookup.value = null
})
function closeLookup () {
  lookup.value = null
  wm.hide(props.config.wmId)
}

const anchor = computed(() => {
  const width = wm.size.value.width
  const poePanelWidth = wm.poePanelWidth.value

  const side = checkPosition.value.x > (window.screenX + width / 2)
    ? 'inventory'
    : 'stash'

  // woke: the lookup panel hangs from the top, so its bottom edge follows a
  // resize drag, where a centred panel's would move at half speed.
  if (lookup.value) {
    return {
      pos: side === 'stash' ? 'tl' : 'tr',
      y: 6,
      x: side === 'stash'
        ? (poePanelWidth / width) * 100
        : ((width - poePanelWidth) / width) * 100
    }
  }

  return {
    pos: side === 'stash' ? 'cl' : 'cr',
    y: 50,
    x: side === 'stash'
      ? (poePanelWidth / width) * 100
      : ((width - poePanelWidth) / width) * 100
  }
})

// The computed anchor over the real config, so a panel's saved size sticks.
const widgetConfig = computed(() => new Proxy(props.config as ItemCheckWidget & { anchor: Anchor }, {
  get: (target, key, receiver) => key === 'anchor' ? anchor.value : Reflect.get(target, key, receiver),
  // No receiver: Vue only notifies when the write arrives on its own proxy.
  set: (target, key, value) => Reflect.set(target, key, value)
}))

// Sets Map mods up (with APT's ratings brought over) the first time a map is checked.
watch(item, (it) => { if (it && wokeIsMapLike(it)) ensureMapModsConfig() })
const wokeMap = computed(() => item.value ? wokeMapCheck(item.value) : null)
</script>
