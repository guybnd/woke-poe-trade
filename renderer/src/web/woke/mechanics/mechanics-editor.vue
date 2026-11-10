<template>
  <div :class="$style.page">
    <div :class="$style.how">
      <span class="flex items-center gap-2 w-dim" :class="$style.howText">How it works <WInfo text="In a zone with a mechanic, an icon appears in the dock. Rest the mouse on it for that mechanic's top prices; click it with the overlay open for the full panel. The launcher opens the panel any time." /></span>
      <w-toggle v-model="autoSwitch" title="With the panel open, entering a mechanic's zone switches it to that mechanic">Panel follows my zone</w-toggle>
    </div>

    <div :class="$style.split">
      <div :class="$style.list" role="tablist" aria-label="League mechanics" aria-orientation="vertical">
        <template v-for="g in groups" :key="g.label">
          <div :class="$style.listHead">{{ g.label }}</div>
          <button v-for="m in g.mechs" :key="m.id" type="button" role="tab" :aria-selected="m.id === mech.id"
            :class="[$style.item, { [$style.itemOn]: m.id === mech.id, [$style.itemOff]: isHidden(m.id) }]" @click="selected = m.id">
            <w-icon :mechanic="m.id" :fallback="m.icon" size="md" /><span>{{ m.label }}</span>
          </button>
        </template>
      </div>

      <div :class="$style.detail" role="tabpanel">
        <div :class="$style.detailHead">
          <w-icon :mechanic="mech.id" :fallback="mech.icon" size="lg" />
          <h2 :class="$style.name">{{ mech.label }}</h2>
          <span :class="[$style.badge, $style[`badge-${guide.kind}`]]">{{ KIND_LABEL[guide.kind] }}</span>
          <w-toggle :class="$style.show" :model-value="!isHidden(mech.id)" @update:model-value="setShown(mech.id, $event)">Show in the overlay</w-toggle>
        </div>

        <div :class="$style.cols">
          <div :class="$style.text">
            <section>
              <h3 :class="$style.sect">What you get</h3>
              <p :class="$style.para">{{ guide.gets }}</p>
            </section>
            <section>
              <h3 :class="$style.sect">When it comes up</h3>
              <ul :class="$style.when">
                <li v-for="w in guide.when" :key="w">{{ w }}</li>
              </ul>
              <div v-if="guide.gap" :class="$style.gap">{{ guide.gap }}</div>
              <div v-if="speaks" class="w-dim" :class="$style.small">If two NPCs speak in one map, the last one decides the card.</div>
            </section>
            <section v-if="guide.tool">
              <h3 :class="$style.sect">Also for this mechanic</h3>
              <button type="button" :class="$style.tool" @click="emit('open', guide.tool.page)">
                <span>{{ guide.tool.text }}</span><em :class="$style.go">{{ guide.tool.go }} <i class="fas fa-arrow-right" /></em>
              </button>
            </section>
          </div>
          <div :class="$style.preview">
            <div class="w-dim" :class="$style.small">Its card, with today's prices</div>
            <div :class="$style.card">
              <mechanic-glance :mech="mech" :config="configWidget" :items="items" :divine="divine" />
            </div>
          </div>
        </div>

        <div v-if="mech.id === 'betrayal'">
          <button type="button" :class="$style.tool" :aria-expanded="rewardsOpen" @click="rewardsOpen = !rewardsOpen">
            <span>Edit Betrayal rewards <span class="w-dim">(only if a patch changes one; empty keeps the default)</span></span>
            <i :class="rewardsOpen ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" />
          </button>
          <div v-if="rewardsOpen" :class="$style.rewards">
            <span />
            <span v-for="d in DIVISIONS" :key="d" class="w-dim">{{ d }}</span>
            <template v-for="m in MEMBERS" :key="m">
              <span class="w-dim w-trunc">{{ m }}</span>
              <input v-for="(d, di) in DIVISIONS" :key="d"
                :value="configWidget.betrayalOverrides[slotKey(m, di)] ?? ''"
                :placeholder="REWARDS[m][di]"
                :aria-label="`${m}, ${d}`"
                :title="REWARDS[m][di]"
                @input="setOverride(m, di, $event)"
                class="w-input rounded px-1 leading-6 min-w-0">
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default { name: 'League mechanics' }
</script>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { Config } from '@/web/Config'
import { WIcon, WInfo, WToggle } from '../ui'
import { usePriceIndex } from '../market/price-index'
import MechanicGlance from './MechanicGlance.vue'
import { MECHANICS, mechanicById } from './data'
import { DIVISIONS, MEMBERS, REWARDS, slotKey } from './betrayal'
import { GUIDE, GUIDE_GROUPS, KIND_LABEL } from './guide'
import { NPC_MECHANIC } from './zone'
import type { MechanicsWidget } from './widget'

const props = defineProps<{
  config: Config
  configWidget: MechanicsWidget
}>()
const emit = defineEmits<{ (e: 'open', page: string): void }>()

const groups = GUIDE_GROUPS.map(g => ({ label: g.label, mechs: MECHANICS.filter(m => g.kinds.includes(GUIDE[m.id].kind)) }))

const selected = shallowRef(props.configWidget.tab)
const mech = computed(() => mechanicById(selected.value) ?? MECHANICS[0])
const guide = computed(() => GUIDE[mech.value.id])
const speaks = computed(() => Object.values(NPC_MECHANIC).includes(mech.value.id))
const rewardsOpen = shallowRef(false)

const prices = usePriceIndex()
const items = computed(() => prices.snapshot.value?.items ?? [])
const divine = computed(() => prices.snapshot.value?.divine ?? null)

const autoSwitch = computed({
  get: () => props.configWidget.autoSwitch,
  set: (on: boolean) => { props.configWidget.autoSwitch = on }
})

function isHidden (id: string) { return props.configWidget.hidden.includes(id) }
function setShown (id: string, shown: boolean) {
  const hidden = props.configWidget.hidden.filter(h => h !== id)
  props.configWidget.hidden = shown ? hidden : [...hidden, id]
}
function setOverride (member: string, di: number, e: Event) {
  // Kept as typed: trimming here would eat the space between two words.
  const value = (e.target as HTMLInputElement).value
  const key = slotKey(member, di)
  const next = Object.fromEntries(Object.entries(props.configWidget.betrayalOverrides).filter(([k]) => k !== key))
  if (value.trim()) next[key] = value
  props.configWidget.betrayalOverrides = next
}
</script>

<style module>
.page { display: flex; flex-direction: column; gap: var(--w-s3); }
.how {
  display: flex; align-items: center; gap: var(--w-s4); flex-wrap: wrap;
  padding: var(--w-s2) var(--w-s3);
  background: var(--w-panel-2); border: 1px solid var(--w-line); border-radius: var(--w-r-sm);
}
.howText { flex: 1 1 22rem; margin: 0; color: var(--w-dim); }
.howText b { color: var(--w-fg); font-weight: 600; }
.split { display: flex; align-items: stretch; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); }
.list { flex: none; width: 13.5rem; padding: var(--w-s1); border-right: 1px solid var(--w-line); }
.listHead {
  padding: var(--w-s2) 6px 2px;
  font-size: var(--w-fs-caps); letter-spacing: 0.06em; text-transform: var(--w-caps-case); color: var(--w-dim);
  font-family: var(--w-caps-face);
}
.item {
  display: flex; align-items: center; gap: var(--w-s2); width: 100%;
  padding: 3px 6px; border-radius: var(--w-r-sm); text-align: left;
}
.item:hover { background: var(--w-panel-3); }
.itemOn, .itemOn:hover { background: var(--w-accent-soft); color: var(--w-accent); }
.itemOff { opacity: 0.45; }
.detail { flex: 1; min-width: 0; padding: var(--w-s3) var(--w-s4); display: flex; flex-direction: column; gap: var(--w-s3); }
.detailHead { display: flex; align-items: center; gap: var(--w-s2); flex-wrap: wrap; }
.name { margin: 0; font-family: var(--w-head); font-size: var(--w-fs-xl); font-weight: 600; }
.show { margin-left: auto; }
.badge {
  padding: 1px 7px; white-space: nowrap;
  font-size: var(--w-fs-xs); border: 1px solid currentColor; border-radius: var(--w-r-pill);
}
.badge-zone { color: var(--w-up); }
.badge-boss { color: var(--w-warn); }
.badge-npc { color: var(--w-info); }
.badge-none { color: var(--w-down); }
.cols { display: flex; flex-wrap: wrap; gap: var(--w-s4); align-items: flex-start; }
.text { flex: 1 1 15rem; min-width: 0; display: flex; flex-direction: column; gap: var(--w-s3); }
.sect {
  margin: 0 0 4px;
  font-size: var(--w-fs-caps); font-weight: 400; letter-spacing: 0.08em; text-transform: var(--w-caps-case); color: var(--w-dim);
  font-family: var(--w-caps-face);
}
.para { margin: 0; }
.when { margin: 0; padding-left: 16px; list-style: disc; display: grid; gap: 2px; }
.when li::marker { color: var(--w-accent); }
.gap {
  margin-top: 6px; padding: 5px 9px; color: var(--w-warn);
  background: color-mix(in srgb, var(--w-warn) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--w-warn) 30%, transparent);
  border-radius: var(--w-r-sm);
}
.small { font-size: var(--w-fs-sm); margin-top: 4px; }
.tool {
  display: flex; align-items: center; justify-content: space-between; gap: var(--w-s2); width: 100%;
  padding: 6px 9px; text-align: left;
  background: var(--w-panel-2); border: 1px solid var(--w-line); border-radius: var(--w-r-sm);
}
.tool:hover { background: var(--w-panel-3); }
.go { flex: none; font-style: normal; font-size: var(--w-fs-sm); color: var(--w-info); }
.preview { flex: none; width: 19rem; max-width: 100%; }
.card {
  margin-top: 4px; padding-bottom: 6px;
  background: var(--w-panel); border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm);
}
.rewards {
  display: grid; grid-template-columns: 5rem repeat(4, minmax(0, 1fr)); gap: 3px; align-items: center;
  margin-top: 6px; font-size: var(--w-fs-sm);
}
</style>
