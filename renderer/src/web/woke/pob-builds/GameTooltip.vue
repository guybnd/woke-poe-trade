<template>
  <Teleport to="body">
    <div v-if="tip" ref="el" :class="[$style.tip, frame]" :style="pos" role="tooltip">
      <header :class="[$style.head, { [$style.double]: lines.length > 1 }]">
        <img v-for="(src, i) in influenceArt" :key="i" :src="src" alt="" :class="[$style.influence, i ? $style.right : $style.left]">
        <div v-for="(l, i) in lines" :key="i">{{ l }}</div>
      </header>

      <template v-if="item">
        <section v-if="itemProps.length" :class="$style.block">
          <div v-for="p in itemProps" :key="p.label"><span :class="$style.label">{{ p.label }}: </span><span :class="$style.value">{{ p.value }}</span></div>
        </section>
        <section v-if="item.levelReq" :class="$style.block">
          <div><span :class="$style.label">Requires Level </span><span :class="$style.value">{{ item.levelReq }}</span></div>
        </section>
        <section v-if="sockets.length" :class="$style.block">
          <div :class="$style.sockets">
            <span :class="$style.label">Sockets:</span>
            <SocketDots v-for="(g, i) in sockets" :key="i" :colours="g" />
          </div>
        </section>
        <section v-if="item.itemLevel" :class="$style.block">
          <div><span :class="$style.label">Item Level: </span><span :class="$style.value">{{ item.itemLevel }}</span></div>
        </section>
        <section v-if="item.implicits.length" :class="$style.block">
          <div v-for="(m, i) in item.implicits" :key="i" :class="$style.mod">{{ m }}</div>
        </section>
        <section v-if="item.mods.length" :class="$style.block">
          <div v-for="(m, i) in item.mods" :key="i" :class="[$style.mod, kindClass(i)]">{{ m }}</div>
        </section>
        <section v-if="item.corrupted || item.mirrored" :class="$style.block">
          <div v-if="item.mirrored" :class="$style.mod">Mirrored</div>
          <div v-if="item.corrupted" :class="$style.corrupted">Corrupted</div>
        </section>
      </template>

      <template v-else-if="gem">
        <section v-if="gemRole" :class="$style.block">
          <div :class="`w-gem-${data?.colour ?? 'w'}`">{{ gemRole }}</div>
        </section>
        <section v-if="gem.level != null || gem.quality" :class="$style.block">
          <div v-if="gem.level != null"><span :class="$style.label">Level: </span><span :class="$style.value">{{ gem.level }}</span></div>
          <div v-if="gem.quality"><span :class="$style.label">Quality: </span><span :class="$style.value">+{{ gem.quality }}%</span></div>
        </section>
        <section v-if="data" :class="$style.block">
          <div><span :class="$style.label">Requires Level </span><span :class="$style.value">{{ data.requiredLevel }}</span></div>
        </section>
        <section v-if="gem.note" :class="$style.block">
          <div :class="$style.note">{{ gem.note }}</div>
        </section>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// Item and gem tooltips in the game's style, beside what's hovered. Sits on
// the page rather than in the panel, so the panel's edges don't clip it.
import { computed, nextTick, onUnmounted, ref, shallowRef, useCssModule, watch } from 'vue'
import SocketDots from './SocketDots.vue'
import { socketGroups } from './build-model'
import { gemData } from './gems'
import type { GemColour } from './gems'
import { hideTip, tip } from './tooltip'
import type { GemTip } from './tooltip'
import type { PobItem } from './widget'

const $style = useCssModule()
const el = ref<HTMLElement | null>(null)
const placed = shallowRef<{ left: number, top: number } | null>(null)

const item = computed<PobItem | null>(() => tip.value?.content.kind === 'item' ? tip.value.content.item : null)
const gem = computed<GemTip | null>(() => tip.value?.content.kind === 'gem' ? tip.value.content : null)
const data = computed(() => gem.value ? gemData(gem.value.name) : null)

const FRAMES: Record<string, string> = { UNIQUE: 'unique', RELIC: 'unique', RARE: 'rare', MAGIC: 'magic' }
const frame = computed(() => $style[gem.value ? `gem-${data.value?.colour ?? 'w'}` : FRAMES[item.value?.rarity ?? ''] ?? 'normal'])

const lines = computed<string[]>(() => {
  if (gem.value) return [data.value?.name ?? gem.value.name]
  if (!item.value) return []
  return [item.value.name, item.value.base].filter(Boolean)
})

const influenceArt = computed(() => (item.value?.influences ?? []).slice(0, 2).map(i => `/images/influence-${i}.png`))

const itemProps = computed(() => {
  const i = item.value
  if (!i) return []
  const out: Array<{ label: string, value: string }> = []
  if (i.quality) out.push({ label: 'Quality', value: `+${i.quality}%` })
  if (i.armour) out.push({ label: 'Armour', value: String(i.armour) })
  if (i.evasion) out.push({ label: 'Evasion Rating', value: String(i.evasion) })
  if (i.energyShield) out.push({ label: 'Energy Shield', value: String(i.energyShield) })
  if (i.ward) out.push({ label: 'Ward', value: String(i.ward) })
  return out
})

const sockets = computed<GemColour[][]>(() => socketGroups(item.value?.sockets ?? '')
  .map(g => g.filter((c): c is GemColour => ['r', 'g', 'b', 'w'].includes(c)))
  .filter(g => g.length))

const ATTRIBUTE: Record<GemColour, string> = { r: 'Strength', g: 'Dexterity', b: 'Intelligence', w: 'Colourless' }
const gemRole = computed(() => {
  const d = data.value
  if (!d) return ''
  return `${ATTRIBUTE[d.colour]} ${d.name.endsWith(' Support') ? 'support' : 'skill'} gem`
})

function kindClass (i: number) {
  const kind = item.value?.modKinds?.[i]
  return kind === 'crafted' ? $style.crafted : kind === 'fractured' ? $style.fractured : undefined
}

// ---- placing it ----

const GAP = 8
const EDGE = 8

function scale () {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--w-ui-scale')) || 1
}

// Items open beside their row, so the rows you're reading stay in view; gems
// open above the name, as in the game. Falls back to whichever side fits.
function place (anchor: DOMRect, w: number, h: number, beside: boolean) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const clampX = (x: number) => Math.max(EDGE, Math.min(x, vw - w - EDGE))
  const clampY = (y: number) => Math.max(EDGE, Math.min(y, vh - h - EDGE))
  const sideways = () => {
    const y = clampY(anchor.top)
    if (anchor.right + GAP + w <= vw - EDGE) return { left: anchor.right + GAP, top: y }
    if (anchor.left - GAP - w >= EDGE) return { left: anchor.left - GAP - w, top: y }
    return null
  }
  const upright = () => {
    const x = clampX(anchor.left + anchor.width / 2 - w / 2)
    if (anchor.top - GAP - h >= EDGE) return { left: x, top: anchor.top - GAP - h }
    if (anchor.bottom + GAP + h <= vh - EDGE) return { left: x, top: anchor.bottom + GAP }
    return null
  }
  return (beside ? sideways() ?? upright() : upright() ?? sideways()) ?? { left: clampX(anchor.right + GAP), top: clampY(anchor.top) }
}

watch(tip, async (t) => {
  placed.value = null
  if (!t) return
  await nextTick()
  if (!el.value) return
  const r = el.value.getBoundingClientRect()
  const s = scale()
  const p = place(t.anchor, r.width, r.height, t.content.kind === 'item')
  placed.value = { left: p.left / s, top: p.top / s }
})

// Hidden until measured, so it never flashes in the wrong spot.
const pos = computed(() => placed.value
  ? { left: `${placed.value.left}px`, top: `${placed.value.top}px` }
  : { left: '0', top: '0', visibility: 'hidden' as const })

onUnmounted(hideTip)
</script>

<style module>
.tip {
  --tip: var(--w-r-normal);
  --tip-rgb: 200, 200, 200;
  position: fixed;
  z-index: 1000;
  zoom: var(--w-ui-scale, 1);
  width: max-content;
  max-width: 27rem;
  min-width: 15rem;
  pointer-events: none;
  text-align: center;
  font-family: var(--w-head);
  font-size: var(--w-fs-lg);
  line-height: 1.25;
  background: var(--w-tip-bg);
  border: 1px solid rgba(var(--tip-rgb), 0.55);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.7);
}
.normal { --tip: var(--w-r-normal); --tip-rgb: 200, 200, 200; }
.magic { --tip: var(--w-r-magic); --tip-rgb: 136, 136, 255; }
.rare { --tip: var(--w-r-rare); --tip-rgb: 255, 255, 119; }
.unique { --tip: var(--w-r-unique); --tip-rgb: 175, 96, 37; }
.gem-r { --tip: var(--w-gem-r); --tip-rgb: 234, 111, 95; }
.gem-g { --tip: var(--w-gem-g); --tip-rgb: 114, 207, 100; }
.gem-b { --tip: var(--w-gem-b); --tip-rgb: 127, 168, 242; }
.gem-w { --tip: var(--w-gem-w); --tip-rgb: 230, 226, 216; }

.head {
  position: relative;
  padding: 5px 34px;
  color: var(--tip);
  font-size: var(--w-fs-xl);
  background: linear-gradient(90deg, rgba(var(--tip-rgb), 0.08), rgba(var(--tip-rgb), 0.26) 22%, rgba(var(--tip-rgb), 0.26) 78%, rgba(var(--tip-rgb), 0.08));
  border-bottom: 1px solid rgba(var(--tip-rgb), 0.7);
}
.double { padding-top: 7px; padding-bottom: 7px; }
.influence { position: absolute; top: 50%; width: 24px; height: 24px; transform: translateY(-50%); object-fit: contain; }
.left { left: 5px; }
.right { right: 5px; }

.block { padding: 5px 14px; }
/* A line that fades out at both ends, as between the game's tooltip sections. */
.block + .block {
  background: linear-gradient(90deg, transparent, rgba(var(--tip-rgb), 0.6), transparent) top / 80% 1px no-repeat;
}
.label { color: var(--w-faint); }
.value { color: #fff; }
.mod { color: var(--w-r-magic); }
.crafted { color: var(--w-mod-crafted); }
.fractured { color: var(--w-mod-fractured); }
.corrupted { color: var(--w-down); }
.note { color: var(--w-dim); font-family: var(--w-body); font-size: var(--w-fs-sm); white-space: pre-line; }
.sockets { display: flex; align-items: center; justify-content: center; gap: 8px; }
</style>
