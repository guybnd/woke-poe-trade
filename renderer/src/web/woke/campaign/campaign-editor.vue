<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <input class="w-input rounded px-1 w-48" placeholder="Widget title" v-model="title" />
    <div class="w-dim text-sm">
      Follows the built-in levelling route from <a href="https://github.com/HeartofPhos/exile-leveling" target="_blank" class="underline">exile-leveling</a>
      (MIT). Steps move on by themselves as you enter each zone. It reads Client.txt, so check its path in the general settings.
    </div>

    <div>
      <div class="mb-1">Route</div>
      <div class="flex flex-col gap-1">
        <w-toggle v-model="leagueStart">League start: trials, the Den and other extra stops</w-toggle>
        <w-toggle v-model="library">Siosa's library gem stop in Act 3</w-toggle>
        <label class="flex items-center gap-2">
          <span>Bandits</span>
          <w-select v-model="bandit" :options="BANDITS" class="w-40" />
        </label>
        <div class="flex items-center gap-2">
          <span class="w-dim">Step {{ Math.min(configWidget.step + 1, total) }} of {{ total }}</span>
          <button class="btn" @click="configWidget.step = 0">Restart route</button>
        </div>
      </div>
    </div>

    <div>
      <div class="mb-1">Display</div>
      <div class="flex flex-col gap-1">
        <label class="flex items-center gap-2">
          <span>Steps on the card</span>
          <input v-model.number="cardSteps" type="number" min="1" max="8" class="w-input rounded px-1 leading-6 w-16">
        </label>
        <w-toggle v-model="showBuild">Show the active PoB build's tree and main gems on the card</w-toggle>
      </div>
    </div>

    <div>
      <div class="mb-1">On screen while levelling</div>
      <div class="w-dim text-sm mb-1">Off by default. These widen the campaign icon, and never show in maps, hideouts or on a character past the campaign. Times need the Run timer.</div>
      <div class="flex flex-col gap-1">
        <w-toggle v-for="o in PIN_OPTIONS" :key="o.id" :model-value="configWidget.pins.includes(o.id)" @update:model-value="togglePin(o.id)">{{ o.label }}</w-toggle>
      </div>
    </div>

    <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
      <span>Hotkey: keep the card open</span>
      <w-hotkey-cell v-model="hotkeyCard" />
      <span>Hotkey: step done</span>
      <w-hotkey-cell v-model="hotkeyNext" />
      <span>Hotkey: step back</span>
      <w-hotkey-cell v-model="hotkeyPrev" />
    </div>

    <label class="flex flex-col gap-1">
      <span>Character name (optional)</span>
      <input v-model="charName" class="w-input rounded px-1 leading-6 w-64"
        placeholder="Only follow this character's level-ups">
    </label>

    <details>
      <summary class="cursor-pointer">Personal notes (optional)</summary>
      <div class="w-dim text-sm my-1">Extra reminders shown on the card under the route. You don't need these.</div>
      <div class="flex flex-col gap-1">
        <label v-for="act in acts" :key="act" class="grid gap-1 items-start" style="grid-template-columns: 5rem 1fr;">
          <span class="w-dim pt-1">{{ actLabel(act) }}</span>
          <textarea :value="configWidget.actNotes[String(act)] ?? ''" @input="setActNote(act, $event)"
            rows="2" class="w-input rounded px-1" placeholder="Note for the whole act" />
        </label>
      </div>
      <div class="mt-2 mb-1">Zone notes</div>
      <div class="flex flex-col gap-2">
        <div v-for="note in configWidget.zoneNotes" :key="note.id" class="grid gap-1" style="grid-template-columns: 1fr auto;">
          <input v-model="note.zone" placeholder="Zone name, e.g. The Ledge" class="w-input rounded px-1 leading-6">
          <button class="leading-none rounded w-btn-soft w-6 h-6" @click="removeZoneNote(note.id)">
            <i class="fas fa-times w-dim" />
          </button>
          <textarea v-model="note.text" rows="2" placeholder="Reminder" class="w-input rounded px-1 col-span-2" />
        </div>
      </div>
      <button class="btn mt-2" @click="addZoneNote">Add zone note</button>
    </details>
  </div>
</template>

<script lang="ts">
import WToggle from '../ui/WToggle.vue'
import WSelect from '../ui/WSelect.vue'

const BANDITS = [
  { value: 'kill', label: 'Kill all' },
  { value: 'oak', label: 'Help Oak' },
  { value: 'kraityn', label: 'Help Kraityn' },
  { value: 'alira', label: 'Help Alira' }
]
import { defineComponent, computed } from 'vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import { configProp, configModelValue } from '@/web/settings/utils'
import { nextId } from '../shared/library'
import { actLabel } from './log-parse'
import { PIN_OPTIONS } from './pins'
import type { PinId } from './pins'
import { migrateCampaign } from './widget'
import type { CampaignWidget } from './widget'
import { bundledRoute } from './route-data'
import type { RouteOptions } from './route-parse'

export default defineComponent({
  name: 'Campaign',
  components: { WToggle, WSelect, WHotkeyCell },
  props: configProp<CampaignWidget>(),
  setup (props) {
    migrateCampaign(props.configWidget)
    function routeOpt<K extends keyof RouteOptions> (key: K) {
      return computed({
        get: () => props.configWidget.route[key],
        set: (value: RouteOptions[K]) => { props.configWidget.route = { ...props.configWidget.route, [key]: value } }
      })
    }
    return {
      BANDITS,
      PIN_OPTIONS,
      togglePin (id: PinId) {
        const pins = props.configWidget.pins
        props.configWidget.pins = pins.includes(id) ? pins.filter(p => p !== id) : [...pins, id]
      },
      acts: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      actLabel,
      total: computed(() => bundledRoute(props.configWidget.route).steps.length),
      title: configModelValue(() => props.configWidget, 'wmTitle'),
      charName: configModelValue(() => props.configWidget, 'charName'),
      showBuild: configModelValue(() => props.configWidget, 'showBuild'),
      cardSteps: configModelValue(() => props.configWidget, 'cardSteps'),
      hotkeyCard: configModelValue(() => props.configWidget, 'hotkeyCard'),
      hotkeyNext: configModelValue(() => props.configWidget, 'hotkeyNext'),
      hotkeyPrev: configModelValue(() => props.configWidget, 'hotkeyPrev'),
      leagueStart: routeOpt('leagueStart'),
      library: routeOpt('library'),
      bandit: routeOpt('bandit'),
      setActNote (act: number, e: Event) {
        props.configWidget.actNotes = { ...props.configWidget.actNotes, [String(act)]: (e.target as HTMLTextAreaElement).value }
      },
      addZoneNote () {
        props.configWidget.zoneNotes.push({ id: nextId(props.configWidget.zoneNotes), zone: '', text: '' })
      },
      removeZoneNote (id: number) {
        props.configWidget.zoneNotes = props.configWidget.zoneNotes.filter(n => n.id !== id)
      }
    }
  }
})
</script>
