<template>
  <div :class="$style.editor">
    <div :class="$style.preview">
      <LabelPreview :text="previewText" :style-override="look" :visibility="visibility" :scale="1.3" />
    </div>
    <WSegmented :model-value="visibility" :options="visibilityOptions" @update:model-value="emit('visibility', $event as Visibility)" />

    <div :class="$style.grid">
      <span class="w-dim">Size<button v-if="changed('fontSize')" type="button" :class="$style.mark" :title="`Back to ${source?.fontSize ?? DEFAULT_FONT}`" aria-label="Reset size" @click="reset('fontSize')" /></span>
      <span class="flex items-center gap-2">
        <input type="range" min="18" max="45" :value="look.fontSize ?? DEFAULT_FONT" class="grow"
          @change="emit('patch', { fontSize: Number(($event.target as HTMLInputElement).value) })">
        <span class="w-num" style="width: 2ch;">{{ look.fontSize ?? DEFAULT_FONT }}</span>
      </span>

      <span class="w-dim">Colours</span>
      <span class="flex items-center flex-wrap" :class="$style.colours">
        <span v-for="c in colourRows" :key="c.key" class="flex items-center gap-1" :title="c.value ? c.value.slice(0, 3).join(' ') : 'none'">
          <input type="color" :value="hex(c.value)" :class="$style.swatch" :aria-label="c.label"
            @change="setColour(c.key, ($event.target as HTMLInputElement).value)">
          <span class="w-dim text-xs">{{ c.short }}</span>
          <button v-if="changed(c.key)" type="button" :class="$style.mark" :title="`Back to ${colourText(c.key)}`" :aria-label="`Reset ${c.label}`" @click="reset(c.key)" />
          <button v-if="c.key === 'border' && c.value" class="w-icon-btn" title="No border" @click="emit('patch', { border: null })"><i class="fas fa-times" /></button>
        </span>
      </span>
    </div>

    <!-- One extra line at a time keeps the rest in view. -->
    <button type="button" class="w-focusable" :class="$style.fold" :aria-expanded="open === 'sound'" @click="toggle('sound')">
      <i aria-hidden="true" :class="open === 'sound' ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" />Sound
      <span class="grow" /><span class="w-dim text-xs w-trunc">{{ look.sound ? `${soundLabel(look.sound.id)}, ${look.sound.volume}` : 'None' }}</span>
      <span v-if="changed('sound')" role="button" tabindex="0" :class="$style.mark" title="Back to the filter's own sound" aria-label="Reset sound" @click.stop="reset('sound')" @keydown.enter.stop="reset('sound')" @keydown.space.prevent.stop="reset('sound')" />
    </button>
    <div v-if="open === 'sound'" :class="$style.foldBody">
      <span class="flex flex-col gap-1" style="min-width: 0;">
        <select :value="look.sound?.id ?? ''" :class="$style.select" style="width: 100%; min-width: 0;" aria-label="Alert sound"
          @change="setSound(($event.target as HTMLSelectElement).value, look.sound?.volume ?? 300)">
          <option value="">None</option>
          <optgroup label="NeverSink's sound pack (plays here)">
            <option v-for="s in NEVERSINK_SOUNDS" :key="s.file" :value="s.file">{{ s.label }}</option>
          </optgroup>
          <optgroup v-if="ownSounds.length" label="Your sounds in the filter folder">
            <option v-for="f in ownSounds" :key="f" :value="f">{{ f }}</option>
          </optgroup>
          <optgroup label="Game sounds (play only in game)">
            <option v-for="id in SOUND_IDS" :key="id" :value="id">{{ id }}{{ uses.get(id)?.length ? ` · ${uses.get(id)!.slice(0, 3).join(', ')}` : '' }}</option>
          </optgroup>
          <option v-if="look.sound && !known(look.sound.id)" :value="look.sound.id">{{ soundLabel(look.sound.id) }}</option>
        </select>
        <span v-if="look.sound" class="flex items-center gap-2">
          <button type="button" class="w-icon-btn" :class="{ [$style.cantPlay]: !isCustomSound(look.sound.id) }"
            :title="isCustomSound(look.sound.id) ? 'Play' : 'The game\'s own sounds play only in game'" :aria-label="`Play ${soundLabel(look.sound.id)}`"
            @click="play(look.sound!.id, look.sound!.volume)"><i class="fas fa-play" /></button>
          <input type="range" min="0" max="300" step="10" :value="look.sound.volume" class="grow" style="min-width: 0;" aria-label="Volume"
            :title="`Volume ${look.sound.volume}`"
            @change="setSound(look.sound!.id, Number(($event.target as HTMLInputElement).value))">
          <span class="w-num w-faint text-xs">{{ look.sound.volume }}</span>
        </span>
      </span>

    </div>

    <button type="button" class="w-focusable" :class="$style.fold" :aria-expanded="open === 'beam'" @click="toggle('beam')">
      <i aria-hidden="true" :class="open === 'beam' ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" />Beam
      <span class="grow" /><span v-if="look.effect" :class="$style.beam" :style="{ background: poeColour(look.effect.color) }" /><span class="w-dim text-xs">{{ look.effect ? `${look.effect.color}${look.effect.temp ? ', on drop' : ''}` : 'None' }}</span>
      <span v-if="changed('effect')" role="button" tabindex="0" :class="$style.mark" title="Back to the filter's own beam" aria-label="Reset beam" @click.stop="reset('effect')" @keydown.enter.stop="reset('effect')" @keydown.space.prevent.stop="reset('effect')" />
    </button>
    <div v-if="open === 'beam'" :class="$style.foldBody">
      <span class="flex items-center gap-1 flex-wrap">
        <button type="button" :class="[$style.dot, $style.none, { [$style.picked]: !look.effect }]" title="No beam" aria-label="No beam"
          @click="setEffect('', false)"><i class="fas fa-ban" /></button>
        <button v-for="c in POE_COLOURS" :key="c" type="button" :class="[$style.dot, { [$style.picked]: look.effect?.color === c }]" :title="c" :aria-label="`${c} beam`"
          @click="setEffect(c, look.effect?.temp ?? false)">
          <span :class="$style.beam" :style="{ background: `linear-gradient(to top, ${poeColour(c)}, transparent)` }" />
        </button>
        <label v-if="look.effect" class="flex items-center gap-1 text-xs w-dim" style="margin-left: 6px;" title="A temporary beam shows for a few seconds when the item drops">
          <input type="checkbox" :checked="look.effect.temp" @change="setEffect(look.effect!.color, ($event.target as HTMLInputElement).checked)"> only on drop
        </label>
      </span>

    </div>

    <button type="button" class="w-focusable" :class="$style.fold" :aria-expanded="open === 'icon'" @click="toggle('icon')">
      <i aria-hidden="true" :class="open === 'icon' ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" />Map icon
      <span class="grow" /><span v-if="look.icon" :style="{ color: poeColour(look.icon.color) }">{{ shapeGlyph(look.icon.shape) }}</span><span class="w-dim text-xs">{{ look.icon ? `${['Large', 'Medium', 'Small'][look.icon.size] ?? ''} ${look.icon.color.toLowerCase()}` : 'None' }}</span>
      <span v-if="changed('icon')" role="button" tabindex="0" :class="$style.mark" title="Back to the filter's own map icon" aria-label="Reset map icon" @click.stop="reset('icon')" @keydown.enter.stop="reset('icon')" @keydown.space.prevent.stop="reset('icon')" />
    </button>
    <div v-if="open === 'icon'" :class="$style.foldBody">
      <span class="flex flex-col gap-1">
        <span class="flex items-center gap-1">
          <button type="button" :class="[$style.dot, $style.none, { [$style.picked]: !look.icon }]" title="No minimap icon" aria-label="No minimap icon"
            @click="setIcon({ size: '' })"><i class="fas fa-ban" /></button>
          <button v-for="sz in ICON_SIZES" :key="sz.value" type="button" :class="[$style.dot, $style.shape, { [$style.picked]: look.icon && String(look.icon.size) === sz.value }]"
            :title="`${sz.label} icon`" :aria-label="`${sz.label} icon`" :style="{ color: look.icon ? poeColour(look.icon.color) : 'var(--w-dim)', fontSize: `${[15, 11, 8][Number(sz.value)]}px` }"
            @click="setIcon({ size: sz.value })">{{ shapeGlyph(look.icon?.shape ?? 'Circle') }}</button>
        </span>
        <template v-if="look.icon">
          <span class="flex items-center gap-1 flex-wrap">
            <button v-for="c in POE_COLOURS" :key="c" type="button" :class="[$style.dot, { [$style.picked]: look.icon.color === c }]" :title="c" :aria-label="`${c} icon`"
              @click="setIcon({ color: c })"><span :class="$style.fill" :style="{ background: poeColour(c) }" /></button>
          </span>
          <span class="flex items-center gap-1 flex-wrap">
            <button v-for="sh in ICON_SHAPES" :key="sh" type="button" :class="[$style.dot, $style.shape, { [$style.picked]: look.icon.shape === sh }]" :title="sh" :aria-label="`${sh} icon`"
              :style="{ color: poeColour(look.icon.color) }" @click="setIcon({ shape: sh })">{{ shapeGlyph(sh) }}</button>
          </span>
        </template>
      </span>
    </div>
    <div v-if="copyFrom.length" class="flex items-center gap-2 text-xs">
      <span class="w-dim">Copy look from</span>
      <select :class="$style.select" value="" aria-label="Copy style from tier" @change="copy(($event.target as HTMLSelectElement).value)">
        <option value="" disabled>tier…</option>
        <option v-for="t in copyFrom" :key="t.tier" :value="t.tier">{{ tierLabel(t.tier) }}</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { WSegmented, toast } from '../ui'
import LabelPreview from './LabelPreview.vue'
import type { Visibility } from './parse'
import { tierLabel } from './names'
import { DEFAULT_BG, DEFAULT_FONT, DEFAULT_TEXT } from './edits'
import type { Colour, StylePatch } from './edits'
import { ICON_SHAPES, ICON_SIZES, POE_COLOURS, SOUND_IDS, poeColour, shapeGlyph } from './colours'
import { useActiveFilter } from './active-filter'
import { NEVERSINK_SOUNDS, installPackSounds, isCustomSound, isPackSound, listFolderSounds, playSound, soundLabel, soundUses } from './sounds'

const active = useActiveFilter()

const props = withDefaults(defineProps<{
  look: StylePatch
  visibility: Visibility
  previewText: string
  // Other tiers whose look can be copied.
  copyFrom?: Array<{ tier: string, look: StylePatch }>
  // The look in the filter as it came: settings that differ get a reset dot.
  source?: StylePatch | null
}>(), { copyFrom: () => [], source: null })

const emit = defineEmits<{
  (e: 'patch', patch: StylePatch): void
  (e: 'visibility', v: Visibility): void
}>()

// The game only takes Minimal in a Ruthless filter.
const visibilityOptions = computed(() => [
  { value: 'Show', label: 'Show' },
  ...(active.value?.doc.value?.ruthless || props.visibility === 'Minimal' ? [{ value: 'Minimal', label: 'Minimal' }] : []),
  { value: 'Hide', label: 'Hide' }
])

const colourRows = computed(() => [
  { key: 'text' as const, label: 'Text', short: 'text', value: props.look.text ?? DEFAULT_TEXT },
  { key: 'border' as const, label: 'Border', short: 'border', value: props.look.border ?? null },
  { key: 'background' as const, label: 'Background', short: 'back', value: props.look.background ?? DEFAULT_BG }
])

// A setting differs from the filter as it came, whichever way it's written.
function changed (key: keyof StylePatch): boolean {
  const s = props.source
  if (!s) return false
  return JSON.stringify(resetValue(key)) !== JSON.stringify(props.look[key] ?? resetValue(key, true))
}

// What the setting is in the source, with the game's default where it sets none.
function resetValue (key: keyof StylePatch, forLook = false): StylePatch[keyof StylePatch] {
  const s = forLook ? props.look : (props.source ?? {})
  switch (key) {
    case 'fontSize': return s.fontSize ?? DEFAULT_FONT
    case 'text': return s.text ?? DEFAULT_TEXT
    case 'background': return s.background ?? DEFAULT_BG
    default: return s[key] ?? null
  }
}

function reset (key: keyof StylePatch) {
  emit('patch', { [key]: resetValue(key) } as StylePatch)
}

function colourText (key: 'text' | 'border' | 'background'): string {
  const v = resetValue(key) as Colour | null
  return v ? v.slice(0, 3).join(' ') : 'none'
}

const open = ref<'sound' | 'beam' | 'icon' | null>(null)
function toggle (which: 'sound' | 'beam' | 'icon') {
  open.value = open.value === which ? null : which
}

function hex (c: Colour | null): string {
  if (!c) return '#000000'
  return '#' + c.slice(0, 3).map(n => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('')
}

function setColour (key: 'text' | 'border' | 'background', value: string) {
  const prev = props.look[key] ?? (key === 'background' ? DEFAULT_BG : DEFAULT_TEXT)
  const rgb = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16))
  emit('patch', { [key]: [rgb[0], rgb[1], rgb[2], prev?.[3] ?? 255] as Colour })
}

const dir = computed(() => active.value?.config.folder ?? '')
const uses = computed(() => soundUses(active.value?.doc.value ?? null))
const ownSounds = ref<string[]>([])
onMounted(async () => {
  ownSounds.value = (await listFolderSounds(dir.value)).filter(f => !isPackSound(f))
})

function known (id: string): boolean {
  return SOUND_IDS.includes(id) || isPackSound(id) || ownSounds.value.includes(id)
}

async function play (id: string, volume: number) {
  if (!isCustomSound(id)) {
    toast('The game\'s own sounds only play in game. Pick one from NeverSink\'s pack above to hear it here.')
    return
  }
  if (!await playSound(id, volume, dir.value)) toast(`Couldn't play ${soundLabel(id)}`)
}

function setSound (id: string, volume: number) {
  emit('patch', { sound: id ? { id, volume } : null })
  if (!id || !isCustomSound(id)) return
  play(id, volume)
  // The game plays pack sounds from the filter folder: put it there now.
  if (isPackSound(id)) installPackSounds([id], dir.value).catch(() => toast('Couldn\'t copy the sound into your filter folder'))
}

function setEffect (color: string, temp: boolean) {
  emit('patch', { effect: color ? { color, temp } : null })
}

function setIcon (change: { size?: string, color?: string, shape?: string }) {
  if (change.size === '') { emit('patch', { icon: null }); return }
  const cur = props.look.icon ?? { size: 1, color: 'White', shape: 'Circle' }
  emit('patch', {
    icon: {
      size: change.size != null ? Number(change.size) : cur.size,
      color: change.color ?? cur.color,
      shape: change.shape ?? cur.shape
    }
  })
}

function copy (tier: string) {
  const src = props.copyFrom.find(t => t.tier === tier)
  if (!src) return
  const s = src.look
  // A look the source tier leaves at the game default is copied as that
  // default, not skipped (which kept this tier's own size/colours).
  emit('patch', {
    fontSize: s.fontSize ?? DEFAULT_FONT,
    text: s.text ?? DEFAULT_TEXT,
    border: s.border ?? null,
    background: s.background ?? DEFAULT_BG,
    sound: s.sound ?? null,
    effect: s.effect ?? null,
    icon: s.icon ?? null
  })
}
</script>

<style module>
.editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.preview {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 56px;
  padding: 10px;
  background: #2b2a26;
  border-radius: var(--w-r-sm);
}
.grid {
  display: grid;
  grid-template-columns: 3.5rem minmax(0, 1fr);
  gap: 8px 10px;
  align-items: center;
  font-size: var(--w-fs-sm);
}
.colours { gap: 4px 10px; }
.cantPlay { opacity: 0.45; }
.mark {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-left: 4px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--w-warn);
  vertical-align: 1px;
  cursor: pointer;
  flex: none;
}
.mark:hover { outline: 2px solid var(--w-warn); outline-offset: 1px; }
.foldBody {
  padding: 2px 6px 6px;
  font-size: var(--w-fs-sm);
}
.fold {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 3px 6px;
  background: var(--w-panel-2);
  border: 1px solid transparent;
  border-radius: var(--w-r-sm);
  color: var(--w-dim);
  font-size: var(--w-fs-sm);
  text-align: left;
  cursor: pointer;
}
.fold:hover { border-color: var(--w-line); }
.fold i { font-size: 0.75em; width: 1em; }
.swatch {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--w-line-strong);
  background: none;
  cursor: pointer;
}
.dot {
  position: relative;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  background: #1b1a17;
  cursor: pointer;
  overflow: hidden;
  padding: 0;
}
.dot:hover { border-color: var(--w-line-strong); }
.picked { border-color: var(--w-accent); box-shadow: 0 0 0 1px var(--w-accent); }
.none { color: var(--w-faint); font-size: var(--w-fs-xs); }
.beam {
  width: 4px;
  height: 16px;
  border-radius: var(--w-r-sm);
}
.fill {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.shape {
  font-size: calc(13px * var(--w-text-scale, 1));
  line-height: 1;
}
.select {
  background: var(--w-panel-2);
  color: var(--w-fg);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  padding: 2px 4px;
  font-size: var(--w-fs-sm);
}
</style>
