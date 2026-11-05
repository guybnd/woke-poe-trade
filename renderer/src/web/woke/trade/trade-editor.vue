<template>
  <div class="flex flex-col gap-3 p-2 max-w-2xl">
    <w-setting-section title="Keys">
      <w-setting-row label="Next step" hint="Acts on the top offer: Invite, then Trade, then Thanks, then Kick. Each press sends one chat line.">
        <w-hotkey-cell v-model="stepHotkey" />
      </w-setting-row>
      <w-setting-row label="Busy reply" hint="Tells the top buyer you'll invite them soon.">
        <w-hotkey-cell v-model="busyHotkey" />
      </w-setting-row>
      <w-setting-row label="Skip to the next offer" hint="Moves the top offer behind the others.">
        <w-hotkey-cell v-model="skipHotkey" />
      </w-setting-row>
    </w-setting-section>
    <w-setting-section title="Offers">
      <w-setting-row label="Keep the offer bubble" hint="The bubble with the buyer and item. A set time counts from the last whisper or reply, and keeps the icon that long after your last offer.">
        <w-select v-model="bubbleSeconds" :options="BUBBLE_TIMES" class="w-64" />
      </w-setting-row>
      <w-setting-row label="Offer rows" hint="How offers look until you click one open. Clicking opens all the options either way.">
        <w-select v-model="rowStyle" :options="ROW_STYLES" class="w-64" />
      </w-setting-row>
      <w-setting-row label="Ping on a new offer" hint="A short sound when a buyer whispers you.">
        <w-toggle v-model="ping" />
      </w-setting-row>
      <w-setting-row label="Track whispers I send" hint="Trade whispers you send from the trade site show under your offers, and purchases go into the log.">
        <w-toggle v-model="trackBuying" />
      </w-setting-row>
    </w-setting-section>
    <w-setting-section title="Replies" hint="{who} is the other player, {item} the item, {price} the price. Leave a reply empty to turn its button off.">
      <w-setting-row v-for="key in REPLY_KEYS" :key="key" :label="REPLY_LABELS[key]" stack>
        <div class="flex gap-1 items-center w-full">
          <input :value="replies[key]" :placeholder="DEFAULT_REPLIES[key]" class="w-input rounded px-1 leading-6 grow"
            @input="setReply(key, ($event.target as HTMLInputElement).value)">
          <w-button v-if="replies[key] !== DEFAULT_REPLIES[key]" size="sm" variant="ghost" title="Back to the default text" @click="setReply(key, DEFAULT_REPLIES[key])">
            <i class="fas fa-undo" />
          </w-button>
        </div>
      </w-setting-row>
    </w-setting-section>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { WButton, WHotkeyCell, WSelect, WSettingRow, WSettingSection, WToggle } from '../ui'
import { configProp } from '@/web/settings/utils'
import { pushHostConfig } from '@/web/Config'
import { DEFAULT_REPLIES, REPLY_LABELS } from './widget'
import type { TradeReplies, TradeRowStyle, TradeWidget } from './widget'

const REPLY_KEYS = Object.keys(DEFAULT_REPLIES) as Array<keyof TradeReplies>
const BUBBLE_TIMES = [
  { value: '0', label: 'Until no offers are open' },
  { value: '5', label: '5 seconds' },
  { value: '30', label: '30 seconds' },
  { value: '60', label: '1 minute' },
  { value: '300', label: '5 minutes' }
]
const ROW_STYLES: Array<{ value: TradeRowStyle, label: string }> = [
  { value: 'hover', label: 'One line, next step on hover' },
  { value: 'button', label: 'One line, next step always shown' },
  { value: 'full', label: 'Two lines' }
]

export default defineComponent({
  name: 'Trades',
  components: { WButton, WHotkeyCell, WSelect, WSettingRow, WSettingSection, WToggle },
  props: configProp<TradeWidget>(),
  setup (props) {
    const w = () => props.configWidget
    const key = (prop: 'stepHotkey' | 'busyHotkey' | 'skipHotkey') => computed({
      get: () => w()[prop] ?? null,
      set: (v: string | null) => { w()[prop] = v; pushHostConfig() }
    })
    const replies = computed<TradeReplies>(() => ({ ...DEFAULT_REPLIES, ...(w().replies ?? {}) }))
    return {
      REPLY_KEYS,
      ROW_STYLES,
      BUBBLE_TIMES,
      bubbleSeconds: computed<string>({ get: () => String(w().bubbleSeconds ?? 0), set: (v) => { w().bubbleSeconds = Number(v) } }),
      rowStyle: computed<TradeRowStyle>({ get: () => w().rowStyle ?? 'hover', set: (v) => { w().rowStyle = v } }),
      REPLY_LABELS,
      DEFAULT_REPLIES,
      stepHotkey: key('stepHotkey'),
      busyHotkey: key('busyHotkey'),
      skipHotkey: key('skipHotkey'),
      ping: computed({ get: () => w().ping !== false, set: (v: boolean) => { w().ping = v } }),
      trackBuying: computed({ get: () => w().trackBuying !== false, set: (v: boolean) => { w().trackBuying = v } }),
      replies,
      setReply (k: keyof TradeReplies, v: string) {
        w().replies = { ...replies.value, [k]: v }
      }
    }
  }
})
</script>
