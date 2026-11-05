<template>
  <div :class="$style.wrap" class="w-scroll">
    <div :class="$style.head">
      <WSegmented :model-value="String(area)" :options="areaOptions" title="Area level the pile drops in" @update:model-value="v => area = Number(v)" />
      <WSelect :model-value="compare" :options="compareOptions" style="width: 14rem;" aria-label="Compare with" @update:model-value="v => compare = String(v)" />
      <WToggle v-model="showHidden">Show hidden</WToggle>
      <span class="grow" />
      <WButton size="sm" icon="fas fa-dice" title="Drop a new pile" @click="seed++">Reroll</WButton>
    </div>

    <WBanner v-if="compareError" tone="warn">{{ compareError }}</WBanner>

    <div v-for="side in sides" :key="side.key" :class="$style.side">
      <div :class="$style.title">
        <b>{{ side.title }}</b>
        <span class="w-dim text-xs w-num">{{ side.sum.shown }} of {{ drops.length }} shown · {{ side.sum.beams }} beam{{ side.sum.beams === 1 ? '' : 's' }} · {{ side.sum.sounds }} with sound</span>
        <span v-if="side.diff" class="text-xs" style="color: var(--w-accent);">· {{ side.diff }}</span>
        <WSkeleton v-if="side.loading" :rows="1" :value="false" style="width: 6rem;" />
      </div>
      <div :ref="el => setGround(side.key, el as HTMLElement | null)" :key="`${side.key}-${seed}-${area}`" :class="$style.ground" :style="{ height: `${side.height}px` }">
        <!-- Beams first, so every label sits on top of them. -->
        <template v-for="(d, i) in side.placed" :key="'b' + d.shown.drop.id">
          <span v-if="d.shown.visibility !== 'Hide' && d.shown.look.effect" :class="[$style.beam, { [$style.temp]: d.shown.look.effect.temp }]"
            :style="{ left: `${d.rect.x + d.rect.w / 2 - 1}px`, height: `${d.rect.y + 2}px`, background: `linear-gradient(to bottom, transparent, ${poeColour(d.shown.look.effect.color)})`, animationDelay: `${i * 14}ms` }" />
        </template>
        <span v-for="(d, i) in side.placed" :key="d.shown.drop.id" :class="[$style.drop, { [$style.ghost]: d.shown.visibility === 'Hide', [$style.differs]: d.differs }]"
          :style="{ left: `${d.rect.x}px`, top: `${d.rect.y}px`, animationDelay: `${i * 14}ms` }"
          :title="describe(d.shown)" @click="clickDrop(d.shown)" @contextmenu="dropMenu($event, d.shown)">
          <LabelPreview :text="d.shown.drop.label" :actions="[]" :style-override="d.shown.look" :visibility="d.shown.visibility" :extras="false"
            :scale="SCALE" :default-text="defaultTextColour(d.shown.drop.facts)" />
        </span>
        <div :class="$style.minimap" aria-label="Minimap icons">
          <template v-for="d in side.placed" :key="'m' + d.shown.drop.id">
            <span v-if="d.shown.visibility !== 'Hide' && d.shown.look.icon" :class="$style.mapIcon"
              :style="{ left: `${(d.rect.x + d.rect.w / 2) / side.width * 100}%`, top: `${(d.rect.y + d.rect.h / 2) / side.height * 100}%`, color: poeColour(d.shown.look.icon.color), fontSize: `${[15, 11, 8][d.shown.look.icon.size] ?? 11}px` }">{{ shapeGlyph(d.shown.look.icon.shape) }}</span>
          </template>
        </div>
      </div>
      <div v-if="side.sounds.length" :class="$style.sounds">
        <span class="w-dim text-xs">Sounds</span>
        <button v-for="s in side.sounds" :key="s.id" type="button" :class="$style.sound" :disabled="!isCustomSound(s.id)"
          :title="isCustomSound(s.id) ? `Play ${soundLabel(s.id)}` : 'The game\'s own sounds play only in game'" @click="play(s.id, s.volume)">
          <i :class="isCustomSound(s.id) ? 'fas fa-play' : 'fas fa-volume-up'" /> {{ soundLabel(s.id) }} <span class="w-faint">×{{ s.count }}</span>
        </button>
      </div>
    </div>
    <div class="w-faint text-xs" :class="$style.note">
      Sample drops for area level {{ area }}. Click a label to open its rule.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { WBanner, WButton, WSegmented, WSelect, WSkeleton, WToggle, openMenu, toast } from '../ui'
import LabelPreview from './LabelPreview.vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import type { FilterDoc } from './parse'
import { defaultTextColour, rollDrops } from './drops'
import { labelBox, layoutLabels, runDrops, soundsOf, summarize } from './shower'
import type { ShownDrop } from './shower'
import { poeColour, shapeGlyph } from './colours'
import { LEVEL_NAMES } from './strictness'
import { ruleLabel } from './parse'
import { isCustomSound, playSound, soundLabel } from './sounds'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  anchor?: Element | null
}>()

const emit = defineEmits<{
  (e: 'open-rule', rule: { type: string, tier: string | null }): void
}>()

const SCALE = 1.15
const DROPS = 40

const seed = ref(1)
const area = ref(props.store.areaLevel.value ?? props.config.fallbackAreaLevel)
const showHidden = ref(true)
const compare = ref('off')

const areaOptions = computed(() => {
  const list = [
    { value: '45', label: 'Acts' },
    { value: '68', label: 'T1' },
    { value: '77', label: 'T10' },
    { value: '83', label: 'T16' }
  ]
  const now = props.store.areaLevel.value
  if (now != null && !list.some(o => o.value === String(now))) list.push({ value: String(now), label: `Now ${now}` })
  if (!list.some(o => o.value === String(area.value))) list.push({ value: String(area.value), label: String(area.value) })
  return list
})

const compareOptions = computed(() => {
  const list = [
    { value: 'off', label: 'No comparison' },
    { value: 'untouched', label: 'vs NeverSink as it came' }
  ]
  const ns = props.config.neversink
  if (ns.on) {
    LEVEL_NAMES.forEach((name, i) => { if (i !== ns.level) list.push({ value: String(i), label: `vs ${name}, with your changes` }) })
  }
  return list
})

// The other filter, loaded when the comparison changes.
const other = shallowRef<FilterDoc | null>(null)
const otherLoading = ref(false)
const compareError = ref<string | null>(null)
// A slow read of the level picked before must not land after the one
// picked now (it would show under the new level's name).
let compareSeq = 0
watch([compare, () => props.store.doc.value], async ([c]) => {
  const seq = ++compareSeq
  compareError.value = null
  if (c === 'off') { other.value = null; otherLoading.value = false; return }
  otherLoading.value = true
  try {
    const doc = await props.store.compareDoc(c === 'untouched' ? 'untouched' : Number(c))
    if (seq !== compareSeq) return
    other.value = doc
    if (!doc) compareError.value = 'Nothing to compare with yet.'
  } catch (e) {
    if (seq !== compareSeq) return
    other.value = null
    compareError.value = `Couldn't load that level: ${(e as Error).message}`
  } finally {
    if (seq === compareSeq) otherLoading.value = false
  }
}, { immediate: true })

const drops = computed(() => rollDrops(area.value, seed.value, DROPS))

// Ground widths, measured so labels lay out to the real space.
const widths = reactive<Record<string, number>>({})
const observers = new Map<string, ResizeObserver>()
function setGround (key: string, el: HTMLElement | null) {
  observers.get(key)?.disconnect()
  observers.delete(key)
  if (!el) return
  const ro = new ResizeObserver(() => { widths[key] = el.clientWidth })
  ro.observe(el)
  observers.set(key, ro)
  widths[key] = el.clientWidth
}

const groundHeight = computed(() => compare.value === 'off' ? 380 : 250)

// Real label widths, in the label font, once it has loaded.
const fontsReady = ref(0)
document.fonts?.ready.then(() => { fontsReady.value++ }).catch(() => {})
const ctx = document.createElement('canvas').getContext('2d')
function measure (text: string, px: number): number {
  if (!ctx) return text.length * px * 0.68
  ctx.font = `${px}px FontinSmallCaps, FrizQuadrataC, Georgia, serif`
  return ctx.measureText(text).width
}
// Leave room above the labels for beams.
const BEAM_ROOM = 40

function place (key: string, list: ShownDrop[], against: ShownDrop[] | null) {
  const width = widths[key] || 900
  // Re-measured once the label font has loaded.
  const m = fontsReady.value >= 0 ? measure : undefined
  const visible = list.filter(d => showHidden.value || d.visibility !== 'Hide')
  const { rects, height } = layoutLabels(visible.map(d => labelBox(d.drop.label, d.look.fontSize, SCALE, m)), width, groundHeight.value, seed.value + area.value, BEAM_ROOM, [{ x: width - 104, y: 0, w: 104, h: 82 }])
  return {
    width,
    height,
    placed: visible.map((shown, i) => {
      const o = against?.find(x => x.drop.id === shown.drop.id)
      return { shown, rect: rects[i], differs: o != null && (o.visibility === 'Hide') !== (shown.visibility === 'Hide') }
    })
  }
}

function diffText (mine: ShownDrop[], theirs: ShownDrop[] | null): string {
  if (!theirs) return ''
  const only = mine.filter(d => d.visibility !== 'Hide' && theirs.find(x => x.drop.id === d.drop.id)?.visibility === 'Hide').length
  return only ? `${only} shown here, hidden there` : ''
}

const sides = computed(() => {
  const doc = props.store.doc.value
  if (!doc) return []
  const mine = runDrops(doc, drops.value)
  const theirs = other.value ? runDrops(other.value, drops.value) : null
  const out = [{
    key: 'mine',
    title: props.config.neversink.on ? `Your filter · ${LEVEL_NAMES[props.config.neversink.level]}` : 'Your filter',
    sum: summarize(mine),
    sounds: soundsOf(mine),
    diff: diffText(mine, theirs),
    loading: false,
    ...place('mine', mine, theirs)
  }]
  if (compare.value !== 'off') {
    const list = theirs ?? []
    out.push({
      key: 'other',
      title: compareOptions.value.find(o => o.value === compare.value)?.label.replace(/^vs /, '') ?? '',
      sum: summarize(list),
      sounds: soundsOf(list),
      diff: diffText(list, mine),
      loading: otherLoading.value,
      ...place('other', list, mine)
    })
  }
  return out
})

function ruleName (d: ShownDrop): string {
  return d.type ? ruleLabel(d.type, d.tier) : 'no rule (shows by default)'
}

function describe (d: ShownDrop): string {
  const bits = [`${d.visibility === 'Hide' ? 'Hidden' : 'Shown'} by ${ruleName(d)}`]
  const f = d.drop.facts
  bits.push(`${f.rarity ?? ''} ${f.itemClass ?? ''}${f.mapTier ? `, tier ${f.mapTier}` : ''}${f.socketGroups ? `, sockets ${f.socketGroups.join('-')}` : ''}`.trim())
  if (d.look.sound) bits.push(soundLabel(d.look.sound.id))
  if (d.look.effect) bits.push(`${d.look.effect.color} beam${d.look.effect.temp ? ' on drop' : ''}`)
  return bits.join('\n')
}

function clickDrop (d: ShownDrop) {
  if (d.type) emit('open-rule', { type: d.type, tier: d.tier })
}

async function play (id: string, volume: number) {
  if (!await playSound(id, volume, props.config.folder)) toast(`Couldn't play ${soundLabel(id)}`, { anchor: props.anchor })
}

function dropMenu (e: MouseEvent, d: ShownDrop) {
  const base = d.drop.facts.baseType
  const canOwn = Boolean(base && d.type && d.tier && !d.type.startsWith('woke->'))
  const own = (visibility: 'Show' | 'Hide', text: string) => () => {
    const undo = props.store.editWithUndo({ kind: 'item', type: d.type!, tier: d.tier!, base: base!, visibility, patch: {}, anchor: d.anchor, pin: visibility === 'Show' })
    toast(text, { anchor: props.anchor, undo })
  }
  openMenu(e, [
    ...(d.type ? [{ label: `Open ${ruleName(d)}`, icon: 'fas fa-external-link-alt', action: () => clickDrop(d) }] : []),
    ...(d.look.sound && isCustomSound(d.look.sound.id) ? [{ label: `Play ${soundLabel(d.look.sound.id)}`, icon: 'fas fa-play', action: () => { play(d.look.sound!.id, d.look.sound!.volume) } }] : []),
    ...(canOwn && d.visibility === 'Hide' ? [{ label: `Always show ${base}`, icon: 'fas fa-eye', action: own('Show', `${base} now shows`) }] : []),
    ...(canOwn && d.visibility !== 'Hide' ? [{ label: `Hide ${base}`, icon: 'fas fa-eye-slash', action: own('Hide', `${base} is hidden`) }] : [])
  ])
}
</script>

<style module>
.wrap {
  max-height: min(40rem, 74vh);
  padding: 6px var(--w-pad) 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.side {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.ground {
  position: relative;
  overflow: hidden;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line);
  /* Dusty stone floor. */
  background:
    radial-gradient(ellipse at 30% 60%, rgba(90, 80, 60, 0.35), transparent 60%),
    radial-gradient(ellipse at 75% 30%, rgba(60, 70, 80, 0.3), transparent 55%),
    repeating-radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.015) 0 2px, transparent 2px 7px),
    linear-gradient(160deg, #24221d, #191814 60%, #1f1d18);
}
.drop {
  position: absolute;
  cursor: pointer;
  animation: fall 0.28s ease-out both;
}
.drop:hover { filter: brightness(1.25); z-index: 2; }
.ghost { filter: grayscale(0.6); }
.differs { outline: 1px dashed var(--w-accent); outline-offset: 1px; }
.beam {
  position: absolute;
  top: 0;
  width: 3px;
  opacity: 0.85;
  pointer-events: none;
  animation: fall 0.28s ease-out both;
}
.temp {
  animation: fall 0.28s ease-out both, fade 3.5s ease-in 0.6s forwards;
}
.minimap {
  position: absolute;
  right: 8px;
  top: 8px;
  width: 92px;
  height: 70px;
  border-radius: var(--w-r-sm);
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.12);
  pointer-events: none;
}
.mapIcon {
  position: absolute;
  transform: translate(-50%, -50%);
  line-height: 1;
  text-shadow: 0 0 2px #000;
}
.sounds {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.sound {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 8px;
  border-radius: var(--w-r-pill);
  border: 1px solid var(--w-line);
  background: var(--w-panel-2);
  color: var(--w-fg);
  font-size: var(--w-fs-xs);
}
.sound:not(:disabled):hover { border-color: var(--w-accent); }
.sound:disabled { color: var(--w-dim); cursor: default; }
.note {
  padding-top: 2px;
}
@keyframes fall {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: none; }
}
@keyframes fade {
  to { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .drop, .beam { animation: none; }
  .temp { animation: none; opacity: 0.4; }
}
</style>
