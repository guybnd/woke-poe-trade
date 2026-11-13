<template>
  <div v-for="(chunk, c) in chunks" :key="c" :class="[$style.chunk, { [$style.named]: chunk.heading }]">
    <span :class="$style.tags">
      <span v-for="t in tagsOf(chunk)" :key="t" class="w-num" :class="[$style.tag, gradeClass(t, chunk.lines[0])]" :data-tier="chunk.lines[0].kind === 'crafted' ? 'crafted' : tierOf(t)">{{ t }}</span>
    </span>
    <div :class="$style.middle">
      <div v-if="chunk.heading" :class="$style.heading">{{ chunk.heading }}</div>
      <div v-for="(line, l) in chunk.lines" :key="l">
        <span :class="[$style.line, kindClass(line)]">
          <template v-for="(p, i) in line.parts" :key="i"><span v-if="p.number" class="w-num" :class="$style.number">{{ p.text }}</span><span v-else-if="p.raw" class="w-num" :class="$style.raw" title="Rolled before catalyst quality">{{ p.text }}</span><span v-else-if="p.range" class="w-num" :class="$style.range">{{ p.text }}</span><span v-else><template v-for="(w, j) in elementParts(p.text)" :key="j"><span v-if="w.ele" class="w-ele" :data-ele="w.ele">{{ w.text }}</span><template v-else>{{ w.text }}</template></template></span></template>
          <template v-if="line.quality != null">
            <i :class="$style.track" :style="{ '--q': line.quality, '--roll': rollColour(line.quality) }"><i :style="{ width: `${line.quality}%` }" /></i>
            <span class="w-num" :class="$style.quality" :style="{ '--q': line.quality, '--roll': rollColour(line.quality) }">{{ line.quality }}%</span>
          </template>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// A trade listing's mod as the game's Alt view lays it out: its name on top, then
// its lines. Each line that can roll has an underline that fills with the roll.
// The tier sits in the left margin, with an equal margin on the right so the text
// stays on the tooltip's middle.
import { computed, useCssModule } from 'vue'
import type { ModGroup, ModLine } from '../../price-insight/listing-tip-detail'
import { elementParts } from '../element-words'

const props = defineProps<{ group: ModGroup }>()
const $style = useCssModule()

// Lines with no name to share, as on a unique, each stand alone with their own tags.
const chunks = computed<ModGroup[]>(() => props.group.heading
  ? [props.group]
  : props.group.lines.map(line => ({ heading: '', lines: [line] })))

// Two mods can share a name, so a group can hold more than one tier.
function tagsOf (chunk: ModGroup) {
  return Array.from(new Set(chunk.lines.flatMap(line => line.tags)))
}

function kindClass (line: ModLine) {
  return line.kind === 'crafted' ? $style.crafted : line.kind === 'fractured' ? $style.fractured : $style.mod
}

function tierOf (tag: string) {
  return Number(tag.replace(/\D/g, ''))
}

function gradeClass (tag: string, line: ModLine) {
  if (line.kind === 'crafted') return $style.craftedTag
  const n = tierOf(tag)
  return n === 1 ? $style.t1 : n <= 3 ? $style.t2 : n <= 6 ? $style.t3 : $style.t4
}

// Red at 0, through yellow, to green at 100.
function rollColour (quality: number) {
  return `hsl(${quality * 1.2}, 75%, 50%)`
}
</script>

<style module>
.chunk {
  display: grid;
  grid-template-columns: 3.25rem 1fr 3.25rem;
  gap: 0 8px;
  align-items: center;
  margin: 0 -8px;
}
.named + .named { margin-top: 6px; }
.middle { min-width: 0; }
.heading { color: var(--w-dim); font-size: var(--w-fs-md); }
.tags { display: inline-flex; gap: 2px; }
.tag {
  min-width: 1.5rem;
  padding: 0 3px;
  font-family: var(--w-num);
  font-size: var(--w-fs-sm);
  font-weight: 600;
  line-height: 1.35;
  border-radius: var(--w-r-sm);
}
.t1 { background: var(--w-accent); color: var(--w-accent-fg); }
.t2 { color: var(--w-accent); box-shadow: inset 0 0 0 1px var(--w-accent); }
.t3 { color: var(--w-r-normal); box-shadow: inset 0 0 0 1px var(--w-faint); }
.t4 { color: var(--w-faint); }
.craftedTag { color: var(--w-mod-crafted); box-shadow: inset 0 0 0 1px var(--w-mod-crafted); }
.line { position: relative; display: inline-block; padding-bottom: 2px; white-space: pre-line; }
.mod { color: var(--w-r-magic); }
.crafted { color: var(--w-mod-crafted); }
.fractured { color: var(--w-mod-fractured); }
.number { color: #fff; font-family: var(--w-num); font-size: var(--w-fs-md); font-weight: 600; }
/* The roll before catalyst quality, small and in the quality's blue. */
.raw { color: #8888ff; font-family: var(--w-num); font-size: var(--w-fs-xs); vertical-align: super; line-height: 0; margin-left: 1px; }
.range { color: var(--tip-range); font-family: var(--w-num); font-size: var(--w-fs-md); }
.track { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; overflow: hidden; background: rgba(255, 255, 255, 0.12); border-radius: 1px; }
.track > i { display: block; height: 100%; background: var(--roll); }
/* Hangs off the line's end, so the % doesn't push the text off centre. */
.quality { position: absolute; left: 100%; bottom: 1px; margin-left: 5px; font-family: var(--w-num); font-size: var(--w-fs-xs); font-weight: 600; line-height: 1; white-space: nowrap; color: var(--roll); }

/* PoE 1 / PoE 2 art: a bronze track that fills with gold, brighter for a
 * better roll, with a faint glow from about 70% up. The % keeps the red to
 * green colour, so the number still reads at a glance. */
:global(:root[data-woke-art]) .line:has(> .track) { padding-bottom: 4px; }
:global(:root[data-woke-art]) .track {
  --glow: max(0, (var(--q) - 70) / 30);
  bottom: -1px;
  height: 3px;
  overflow: visible;
  background: #1a130a;
  box-shadow: 0 0 0 1px #4a381c;
}
:global(:root[data-woke-art]) .track > i {
  background: linear-gradient(90deg, #6b4f22, hsl(40deg 60% calc(32% + var(--q) * 0.3%)));
  box-shadow: 0 0 calc(var(--glow) * 3px) hsl(42deg 80% 60% / calc(var(--glow) * 0.45));
}
/* PoE 1 / PoE 2 art: bevelled badges. T1 gold, T2 bronze, T3 a dark well;
 * lower tiers drop the badge and fade. */
:global(:root[data-woke-art]) .tag { background: none; box-shadow: none; color: #504b43; }
:global(:root[data-woke-art]) .tag[data-tier="1"] {
  background: linear-gradient(#f3cf7a, #a8792a 55%, #7a5518);
  color: #1a1209;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(0, 0, 0, 0.4), 0 0 0 1px #3a2a10;
}
:global(:root[data-woke-art]) .tag[data-tier="2"] {
  background: linear-gradient(#8a6a3c, #4a3518);
  color: #f0dcb0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 0 0 1px #2a1d0c;
}
:global(:root[data-woke-art]) .tag[data-tier="3"] {
  background: #16110b;
  color: #b39b74;
  box-shadow: inset 0 1px 2px #000, 0 0 0 1px #3a2c18;
}
:global(:root[data-woke-art]) .tag:is([data-tier="4"], [data-tier="5"]) { color: #8f897e; }
:global(:root[data-woke-art]) .tag:is([data-tier="6"], [data-tier="7"]) { color: #6e695f; }
:global(:root[data-woke-art]) .tag[data-tier="crafted"] { color: var(--w-mod-crafted); box-shadow: inset 0 0 0 1px var(--w-mod-crafted); }
/* Element words, as in the price check's stat lines (colours in poe-mode.css). */
:global(:root[data-woke-art]) .line :global(.w-ele) { color: color-mix(in srgb, var(--w-ele) 55%, currentColor); }
</style>
