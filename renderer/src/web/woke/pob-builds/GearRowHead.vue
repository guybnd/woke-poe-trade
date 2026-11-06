<template>
  <div :class="small ? $style.gearRowPlain : $style.gearRow"
    @mouseenter="row.item && showTip($event, { kind: 'item', item: row.item })" @mouseleave="hideTip">
    <span :class="[$style.cell, small && $style.cellSmall, cellClass]">
      <img v-if="art" :src="art" alt="" :class="['w-game-icon', small ? $style.artSmall : $style.art]" loading="lazy" draggable="false">
      <i v-else-if="item" class="fas fa-question w-faint" />
    </span>
    <span class="min-w-0 flex flex-col">
      <span class="w-trunc" :class="nameClass">{{ name }}</span>
      <span class="w-dim text-xs w-trunc"><span v-if="main" class="w-accent">Main skill · </span>{{ detail }}</span>
    </span>
    <span class="ml-auto flex items-center gap-1.5">
      <template v-if="!small">
        <SocketDots v-for="(grp, j) in dots" :key="j" :colours="grp" />
      </template>
      <WButton v-if="checkText" size="sm" variant="ghost" icon="fas fa-search" :title="`Price check ${name} with its stats`" @click="priceCheck" />
      <WButton v-else-if="trade" size="sm" variant="ghost" icon="fas fa-search" :title="`Search the trade site for ${name}`" @click="openTrade" />
    </span>
  </div>
</template>

<script setup lang="ts">
// An item's art, name and sockets, on the Gear tab. Its tooltip belongs to this
// head alone, so hovering a gem below shows that gem's tooltip instead.
import { computed, useCssModule } from 'vue'
import { WButton } from '../ui'
import { AppConfig } from '@/web/Config'
import { useLeagues } from '@/web/background/Leagues'
import { parseClipboard } from '@/parser'
import { Host } from '@/web/background/IPC'
import SocketDots from './SocketDots.vue'
import { slotLabel, socketGroups } from './build-model'
import type { GearRow } from './build-model'
import type { GemColour } from './gems'
import { itemArt } from './item-art'
import { pobItemText } from './item-text'
import { hideTip, showTip } from '../ui/tooltip/tooltip'
import type { PobItem } from './widget'

const props = defineProps<{ row: GearRow, main?: boolean, small?: boolean }>()
const $style = useCssModule()

const item = computed(() => props.row.item)
const name = computed(() => item.value?.name ?? slotLabel(props.row.slot))
const art = computed(() => item.value ? itemArt(item.value) : null)

// Mods worth reading at a glance on a rare: the first few explicit ones.
function keyMods (it: PobItem): string[] {
  if (it.rarity === 'UNIQUE' || it.rarity === 'RELIC') return []
  return it.mods.slice(0, 2)
}

const detail = computed(() => {
  const it = item.value
  if (!it) return 'No item in this set'
  if (props.small) return slotLabel(props.row.slot)
  return [slotLabel(props.row.slot), it.base, ...keyMods(it)].filter(Boolean).join(' · ')
})

const dots = computed<GemColour[][]>(() => socketGroups(item.value?.sockets ?? '')
  .map(g => g.filter((c): c is GemColour => ['r', 'g', 'b', 'w'].includes(c)))
  .filter(g => g.length))

const nameClass = computed(() => {
  switch (item.value?.rarity) {
    case undefined: return 'w-dim'
    case 'UNIQUE':
    case 'RELIC': return 'w-rarity-unique'
    case 'RARE': return 'w-rarity-rare'
    case 'MAGIC': return 'w-rarity-magic'
    default: return 'w-rarity-normal'
  }
})

const cellClass = computed(() => {
  switch (item.value?.rarity) {
    case undefined: return $style.cellEmpty
    case 'UNIQUE':
    case 'RELIC': return $style.cellUnique
    case 'RARE': return $style.cellRare
    case 'MAGIC': return $style.cellMagic
    default: return undefined
  }
})

// PoB writes items in English, which only the English item data can read, and
// it knows old uniques the item data doesn't. Those keep a trade site search.
const checkText = computed(() => {
  if (!item.value || AppConfig().language !== 'en') return null
  const text = pobItemText(item.value)
  return parseClipboard(text).isOk() ? text : null
})

const leagues = useLeagues()
const trade = computed(() => {
  const it = item.value
  const league = leagues.selectedId.value
  if (!it || !league || (it.rarity !== 'UNIQUE' && it.rarity !== 'RELIC')) return null
  const query = {
    query: { status: { option: 'online' }, name: it.name, ...(it.base ? { type: it.base } : {}) },
    sort: { price: 'asc' }
  }
  return `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(query))}`
})

function openTrade () {
  if (trade.value) window.open(trade.value)
}

function priceCheck (e: MouseEvent) {
  if (!checkText.value) return
  hideTip()
  const from = (e.currentTarget as HTMLElement).getBoundingClientRect()
  Host.selfDispatch({
    name: 'MAIN->CLIENT::item-text',
    payload: {
      clipboard: checkText.value,
      position: {
        x: window.screenX + from.x + from.width / 2,
        y: window.screenY + from.y + from.height / 2
      },
      focusOverlay: true,
      target: 'price-check'
    }
  })
}
</script>

<style module>
.gearRow, .gearRowPlain {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.gearRow:hover, .gearRowPlain:hover { background: var(--w-line-soft); }
.gearRowPlain { gap: 6px; padding: 3px 0; }
/* An inventory cell, tinted by rarity as the game tints a hovered item. */
.cell {
  width: 44px;
  height: 44px;
  flex: none;
  display: grid;
  place-items: center;
  background: rgba(8, 10, 30, 0.75);
  border: 1px solid var(--w-line);
}
.cellSmall { width: 28px; height: 28px; }
.cellUnique { background: rgba(175, 96, 37, 0.2); border-color: rgba(175, 96, 37, 0.6); }
.cellRare { background: rgba(255, 255, 119, 0.08); border-color: rgba(255, 255, 119, 0.35); }
.cellMagic { background: rgba(136, 136, 255, 0.12); border-color: rgba(136, 136, 255, 0.45); }
.cellEmpty { background: none; border: 1px dashed var(--w-line-strong); }
.art { max-width: 40px; max-height: 40px; object-fit: contain; }
.artSmall { max-width: 24px; max-height: 24px; object-fit: contain; }
</style>
