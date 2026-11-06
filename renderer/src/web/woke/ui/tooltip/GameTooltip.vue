<template>
  <Teleport to="body">
    <div v-if="tip" ref="el" :class="[$style.tip, frame, { [$style.wide]: listing || swap }]" :style="pos" role="tooltip">
      <header :class="[$style.head, { [$style.double]: lines.length > 1, [$style.art]: headArt }]" :style="headArt">
        <img v-for="(src, i) in influenceArt" :key="i" :src="src" alt="" :class="[$style.influence, i ? $style.right : $style.left]">
        <div v-for="(l, i) in lines" :key="i">{{ l }}</div>
      </header>

      <SwapCard v-if="swap" :swap="swap" />
      <template v-else-if="item && listing">
        <section v-if="listing.props.length" :class="$style.block">
          <div v-for="(line, l) in listing.props" :key="l"><span v-for="(p, i) in line" :key="i" :class="$style[`p-${p.tone}`]">{{ p.text }}</span></div>
        </section>
        <section v-if="listing.requires.length" :class="$style.block">
          <div><span v-for="(p, i) in listing.requires" :key="i" :class="$style[`p-${p.tone}`]">{{ p.text }}</span></div>
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
        <section v-if="listing.implicits.length" :class="$style.block">
          <ListingModRow v-for="(line, i) in listing.implicits" :key="i" :line="line" :bars="rollBars" />
        </section>
        <section v-if="listing.groups.length" :class="$style.block">
          <template v-for="(group, g) in listing.groups" :key="g">
            <div v-if="group.heading" :class="[$style.modHeading, { [$style.barsHeading]: rollBars }]">{{ group.heading }}</div>
            <div v-else-if="g" :class="$style.modGap" />
            <ListingModRow v-for="(line, i) in group.lines" :key="i" :line="line" :bars="rollBars" />
          </template>
        </section>
        <section v-if="listing.tail.length || item.corrupted || item.mirrored" :class="$style.block">
          <div v-for="t in listing.tail" :key="t.text" :class="t.kind === 'fractured' ? $style.fractured : $style.label">{{ t.text }}</div>
          <div v-if="item.mirrored" :class="$style.mod">Mirrored</div>
          <div v-if="item.corrupted" :class="$style.corrupted">Corrupted</div>
        </section>
        <footer v-if="listing.foot.length" :class="$style.strip" class="w-num">
          <span v-for="s in listing.foot" :key="s.label"><span :class="$style.label">{{ `${s.label} ` }}</span><span :class="$style.value">{{ s.value }}</span></span>
          <span v-if="listing.footNote" class="w-faint" :class="$style.span">{{ listing.footNote }}</span>
        </footer>
      </template>

      <template v-else-if="item">
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

      <template v-else-if="lookup">
        <section v-for="(lines, s) in lookup.model.sections" :key="s" :class="$style.block">
          <div v-for="(line, l) in lines" :key="l">
            <span v-for="(p, i) in line" :key="i" :class="$style[`t-${p.tone}`]">{{ p.text }}</span>
          </div>
        </section>
        <footer v-if="lookup.uniques" :class="$style.uniques">
          <div v-for="u in shownUniques" :key="u.name" :class="$style.uniqueRow">
            <span :class="[$style.uniqueName, 'w-trunc']">{{ u.name }}</span>
            <WPrice v-if="u.chaos != null" :chaos="u.chaos" :divine="xchgRate ?? null" />
            <span v-else class="w-faint">no price</span>
            <span :class="$style[`g-${u.grade}`]">{{ u.label }}{{ u.thin ? ', thin market' : '' }}</span>
          </div>
          <div v-if="moreUniques" class="w-faint">and {{ moreUniques }} more</div>
        </footer>
        <footer v-if="lookup.market?.range" :class="$style.strip">
          <template v-if="lookup.market.range.low !== lookup.market.range.high"><WPrice :chaos="lookup.market.range.low" :divine="xchgRate ?? null" /> to </template><WPrice :chaos="lookup.market.range.high" :divine="xchgRate ?? null" />
          <span class="w-dim" :class="$style.span">{{ lookup.market.range.count }} prices</span>
        </footer>
        <footer v-else-if="lookup.market" :class="$style.strip">
          <WPrice :chaos="lookup.market.chaos" :divine="xchgRate ?? null" />
          <span v-if="lookup.market.variant" class="w-dim">{{ lookup.market.variant }}</span>
          <WDelta :value="lookup.market.change" title="Change over 7 days" />
          <WSpark :values="lookup.market.graph" :width="88" :height="20" />
          <span class="w-faint" :class="$style.span">7 days</span>
        </footer>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// Item and gem tooltips in the game's style, beside what's hovered. Sits on
// the page rather than in the panel, so the panel's edges don't clip it.
// Mounted once in the overlay.
import { computed, inject, nextTick, onMounted, onUnmounted, ref, shallowRef, useCssModule, watch } from 'vue'
import { usePoeninja } from '@/web/background/Prices'
import { AppConfig } from '@/web/Config'
import type { PriceCheckWidget } from '@/web/overlay/interfaces'
import type { WidgetManager } from '@/web/overlay/interfaces'
import SocketDots from '../../pob-builds/SocketDots.vue'
import { socketGroups } from '../../pob-builds/build-model'
import { gemData } from '../../pob-builds/gems'
import type { GemColour } from '../../pob-builds/gems'
import type { PobItem } from '../../pob-builds/widget'
import SwapCard from '../../pob-builds/SwapCard.vue'
import ListingModRow from './ListingModRow.vue'
import WDelta from '../WDelta.vue'
import WPrice from '../WPrice.vue'
import WSpark from '../WSpark.vue'
import { hideTip, tip } from './tooltip'
import type { GemTip, LookupTip, SwapTip } from './tooltip'

const $style = useCssModule()
const el = ref<HTMLElement | null>(null)
const placed = shallowRef<{ left: number, top: number } | null>(null)

const item = computed<PobItem | null>(() => tip.value?.content.kind === 'item' ? tip.value.content.item : null)
const listing = computed(() => tip.value?.content.kind === 'item' ? tip.value.content.listing ?? null : null)
const rollBars = computed(() => AppConfig<PriceCheckWidget>('price-check')?.listingRolls === 'bars')
const gem = computed<GemTip | null>(() => tip.value?.content.kind === 'gem' ? tip.value.content : null)
const swap = computed<SwapTip | null>(() => tip.value?.content.kind === 'swap' ? tip.value.content : null)
const lookup = computed<LookupTip | null>(() => tip.value?.content.kind === 'lookup' ? tip.value.content : null)
// Live: the divine rate can arrive after the tooltip opens.
const { xchgRate } = usePoeninja()
const MAX_UNIQUES = 12
const shownUniques = computed(() => lookup.value?.uniques?.slice(0, MAX_UNIQUES) ?? [])
const moreUniques = computed(() => Math.max(0, (lookup.value?.uniques?.length ?? 0) - MAX_UNIQUES))
const data = computed(() => gem.value ? gemData(gem.value.name) : null)

const FRAMES: Record<string, string> = { UNIQUE: 'unique', RELIC: 'unique', RARE: 'rare', MAGIC: 'magic' }
const frameName = computed<string>(() => lookup.value ? lookup.value.model.frame : gem.value ? `gem-${data.value?.colour ?? 'w'}` : FRAMES[item.value?.rarity ?? ''] ?? 'normal')
const frame = computed(() => $style[frameName.value])

const lines = computed<string[]>(() => {
  if (swap.value) return [swap.value.title]
  if (lookup.value) return [lookup.value.model.name, lookup.value.model.base ?? ''].filter(Boolean)
  if (gem.value) return [data.value?.name ?? gem.value.name]
  if (!item.value) return []
  return [item.value.name, item.value.base].filter(Boolean)
})

// The game's own header art. Other frames keep the plain colour band.
const ART_SINGLE = new Set(['normal', 'magic', 'rare', 'unique', 'currency'])
const ART_DOUBLE = new Set(['rare', 'unique'])
const headArt = computed(() => {
  const double = lines.value.length > 1
  if (!(double ? ART_DOUBLE : ART_SINGLE).has(frameName.value)) return undefined
  const name = item.value?.rarity === 'RELIC' ? 'relic' : frameName.value
  const file = (side: string) => `url(/images/item-frame/header-${double ? 'double-' : ''}${name}-${side}.png)`
  return { backgroundImage: `${file('left')}, ${file('right')}, ${file('middle')}` }
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

// Items follow the cursor, below and to its right, flipping at the screen's
// edges. Gems open above the name, as in the game.
const CURSOR_GAP = 16
const pointer = shallowRef<{ x: number, y: number } | null>(null)

function nearCursor (at: { x: number, y: number }, w: number, h: number) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  // Flip only if the other side has room; a tip too big for both slides along
  // the edge instead of jumping across the cursor.
  const axis = (cursor: number, size: number, screen: number) => {
    const after = cursor + CURSOR_GAP
    const before = cursor - CURSOR_GAP - size
    const at = after + size <= screen - EDGE || before < EDGE ? after : before
    return Math.max(EDGE, Math.min(at, screen - size - EDGE))
  }
  return { left: axis(at.x, w, vw), top: axis(at.y, h, vh) }
}

// Falls back to whichever side fits.
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

function reposition () {
  const t = tip.value
  if (!t || !el.value) return
  const r = el.value.getBoundingClientRect()
  const s = scale()
  const p = t.content.kind !== 'gem' && pointer.value
    ? nearCursor(pointer.value, r.width, r.height)
    : place(t.anchor, r.width, r.height, t.content.kind !== 'gem')
  placed.value = { left: p.left / s, top: p.top / s }
}

function onPointer (e: MouseEvent) {
  pointer.value = { x: e.clientX, y: e.clientY }
  if (tip.value && tip.value.content.kind !== 'gem') reposition()
}

watch(tip, async (t) => {
  placed.value = null
  if (!t) return
  await nextTick()
  if (!el.value) return
  reposition()
})

// Switching how rolls are drawn changes the tip's size under a still cursor.
watch(rollBars, async () => {
  await nextTick()
  reposition()
})

// Hidden until measured, so it never flashes in the wrong spot.
const pos = computed(() => placed.value
  ? { left: `${placed.value.left}px`, top: `${placed.value.top}px` }
  : { left: '0', top: '0', visibility: 'hidden' as const })

// It sits outside the panel, so nothing hides it with the panel, and the
// overlay gets no mouse events once the game has focus: without this, closing
// the overlay mid-hover would leave it over the game. A scroll moves the row
// away from under it.
const wm = inject<WidgetManager | undefined>('wm', undefined)
watch(() => wm?.active.value, hideTip)
onMounted(() => {
  window.addEventListener('mousemove', onPointer, true)
  window.addEventListener('mouseover', onPointer, true)
  // A drag sends no mouse events, so the tooltip would freeze over the targets.
  window.addEventListener('dragstart', hideTip, true)
  window.addEventListener('blur', hideTip)
  window.addEventListener('scroll', hideTip, true)
})
onUnmounted(() => {
  window.removeEventListener('mousemove', onPointer, true)
  window.removeEventListener('mouseover', onPointer, true)
  window.removeEventListener('dragstart', hideTip, true)
  window.removeEventListener('blur', hideTip)
  window.removeEventListener('scroll', hideTip, true)
  hideTip()
})
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
.normal { --tip: var(--w-r-normal); --tip-rgb: 200, 200, 200; --sep: url(/images/item-frame/separator-normal.png); --sep-line: 0; }
.magic { --tip: var(--w-r-magic); --tip-rgb: 136, 136, 255; --sep: url(/images/item-frame/separator-magic.png); --sep-line: 0; }
.rare { --tip: var(--w-r-rare); --tip-rgb: 255, 255, 119; --sep: url(/images/item-frame/separator-rare.png); --sep-line: 0; }
.unique { --tip: var(--w-r-unique); --tip-rgb: 175, 96, 37; --sep: url(/images/item-frame/separator-unique.png); --sep-line: 0; }
.currency { --tip: var(--w-r-currency); --tip-rgb: 170, 158, 130; --sep: url(/images/item-frame/separator-currency.png); --sep-line: 0; }
.card { --tip: var(--w-r-divination); --tip-rgb: 127, 181, 214; }
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
/* Ends fixed, the middle repeats. Sized to the header, which grows with text scale. */
.art {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 34px;
  padding: 2px 34px;
  background-position: left center, right center, center;
  background-size: auto 100%;
  background-repeat: no-repeat, no-repeat, repeat-x;
  border-bottom: 0;
}
.art.double { min-height: 54px; padding: 2px 46px; }
.influence { position: absolute; top: 50%; width: 24px; height: 24px; transform: translateY(-50%); object-fit: contain; }
.left { left: 5px; }
.right { right: 5px; }

.block { padding: 5px 14px; }
/* A line that fades out at both ends, as between the game's tooltip sections. */
.block + .block {
  background: var(--sep, none) center top / auto 8px no-repeat, linear-gradient(90deg, transparent, rgba(var(--tip-rgb), var(--sep-line, 0.6)), transparent) top / 80% 1px no-repeat;
}
.label { color: var(--w-faint); }
.value { color: #fff; }
.mod { color: var(--w-r-magic); }
.crafted { color: var(--w-mod-crafted); }
.fractured { color: var(--w-mod-fractured); }
.corrupted { color: var(--w-down); }
.note { color: var(--w-dim); font-family: var(--w-body); font-size: var(--w-fs-sm); white-space: pre-line; }
.sockets { display: flex; align-items: center; justify-content: center; gap: 8px; }

/* A listing's headings and tags need the room. */
.wide { max-width: 46rem; --tip-range: #d9c48f; }
.modHeading { margin-top: 6px; color: var(--w-dim); font-size: var(--w-fs-md); }
.modHeading:first-child { margin-top: 0; }
.modGap { height: 8px; }
/* Lines up with the mod text in the bars view: the tag column's width, less the
   row's pull to the left, plus the gap after the tags. */
.barsHeading { padding-left: 3.5rem; text-align: left; }
.p-label { color: var(--w-faint); }
.p-value { color: #fff; }
.p-aug { color: var(--w-r-magic); }
/* The game's damage colours, cold and fire lifted to read on the dark tooltip. */
.p-fire { color: #d9543f; }
.p-cold { color: #6a9fd8; }
.p-lightning { color: #ffd700; }
.p-chaos { color: #d02090; }

.t-label { color: var(--w-faint); }
.t-value { color: #fff; }
.t-text { color: var(--w-r-normal); }
.t-mod { color: var(--w-r-magic); }
.t-dim { color: var(--w-dim); }
.t-gem { color: var(--w-r-gem); }
.t-flavour { color: var(--w-r-unique); font-style: italic; }
.t-corrupted { color: var(--w-down); }
.t-mutated { color: var(--w-corrupt); }
.t-unique { color: var(--w-r-unique); }
.t-rare { color: var(--w-r-rare); }
.t-currency { color: var(--w-r-currency); }
.t-card { color: var(--w-r-divination); }

/* What a base in a unique tier can drop as, most valuable first. */
.uniques {
  padding: 6px 12px;
  font-family: var(--w-body);
  font-size: var(--w-fs-sm);
  text-align: left;
  background: rgba(255, 255, 255, 0.03);
  border-top: 1px solid rgba(var(--tip-rgb), 0.4);
}
.uniqueRow {
  display: grid;
  grid-template-columns: minmax(8rem, 1fr) 4.5rem 6.5rem;
  gap: var(--w-s2);
  align-items: center;
  min-height: 20px;
}
.uniqueName { color: var(--w-r-unique); }
.g-high { color: var(--w-accent); }
.g-mid { color: var(--w-dim); }
.g-trash { color: var(--w-down); }
.g-unknown { color: var(--w-faint); }

/* The price at the foot of a looked-up item. */
.strip {
  display: flex;
  align-items: center;
  gap: var(--w-s2);
  padding: 6px 12px;
  font-family: var(--w-body);
  font-size: var(--w-fs-sm);
  text-align: left;
  background: rgba(255, 255, 255, 0.03);
  border-top: 1px solid rgba(var(--tip-rgb), 0.4);
}
.span { margin-left: auto; }
</style>
