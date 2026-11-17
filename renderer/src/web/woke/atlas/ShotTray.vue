<template>
  <div :class="$style.tray" data-shot-tray>
    <div v-if="shots.length" :class="$style.grid">
      <div v-for="s in shots" :key="s.id" :class="[$style.shot, { [$style.bad]: BAD.has(s.state) }]" data-shot>
        <img :src="s.thumb" :alt="s.name">
        <button type="button" :class="$style.remove" class="w-focusable" :title="`Remove ${s.name}`" @click="remove(s.id)"><i class="fas fa-times" /></button>
        <div :class="[$style.cap, captionClass(s)]" class="w-trunc" :title="s.name">{{ caption(s) }}</div>
      </div>
    </div>
    <div class="flex gap-1 items-center flex-wrap">
      <WButton size="sm" icon="fas fa-image" @click="pick">Screenshots…</WButton>
      <!-- The count is on the Import button; only passives no lit line showed are said here. -->
      <span v-if="total && model && total.nodes.length > model.points" class="w-down text-xs" data-shot-over>Over {{ model.points }} points</span>
      <span v-if="total?.joined" class="w-faint text-xs" data-shot-total title="Passives on the shortest path to lit ones no line showed: under the bottom bar, off the picture, or next to the start">
        {{ total.joined }} guessed
      </span>
      <span v-else-if="shots.length && !model" class="w-faint text-xs">Loading the atlas tree…</span>
    </div>
    <input ref="input" type="file" accept="image/png,image/jpeg" multiple hidden @change="picked">
  </div>
</template>

<script setup lang="ts">
// Screenshots of the game's atlas tree, read into passives (Guy's pick B):
// each picture says what it read, and several add up (zoomed-in shots of
// different parts). Pasted (Ctrl+V in the Import box), dropped or picked.
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { WButton } from '../ui'
import { hostRequest } from '../shared/host'
import type { AtlasTreeModel } from './atlas-tree'
import type { ShotRead } from './shot-import'

const props = defineProps<{ model: AtlasTreeModel | null }>()
const emit = defineEmits<{ (e: 'update', read: ShotRead | null): void, (e: 'pending', on: boolean): void }>()

interface Shot {
  id: number
  name: string
  thumb: string
  image: string
  state: 'waiting' | 'reading' | 'ok' | 'none' | 'format' | 'too-big' | 'error'
  lines?: boolean[]
  rings?: boolean[]
}

const BAD = new Set<Shot['state']>(['none', 'format', 'too-big', 'error'])
const shots = shallowRef<Shot[]>([])
const input = shallowRef<HTMLInputElement>()
let nextId = 1

type Lib = typeof import('./shot-import')
type Overlay = typeof import('../pob-builds/tree-overlay')
// Per tree: what main reads in each picture.
let prepared: { model: AtlasTreeModel, lib: Lib, lines: ReturnType<Lib['shotLines']>, ringIds: number[], probes: number[][], extra: number[][] } | null = null

async function prepare (model: AtlasTreeModel) {
  if (prepared?.model === model) return prepared
  const [lib, overlay]: [Lib, Overlay] = await Promise.all([import('./shot-import'), import('../pob-builds/tree-overlay')])
  const lines = lib.shotLines(model)
  const ringIds = lib.ringNodes(model)
  // The same points the Alt+T atlas drawing fits, sent to the picture reader.
  await hostRequest('atlas-shot-points', overlay.fitPoints(model.nodes))
  prepared = { model, lib, lines, ringIds, probes: lib.ringProbes(model, ringIds), extra: overlay.lineProbes(lines, model.nodes) }
  return prepared
}

function readFile (file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error ?? new Error('unreadable'))
    r.readAsDataURL(file)
  })
}

function add (files: Iterable<File>) {
  const images = [...files].filter(f => f.type.startsWith('image/'))
  // Not a picture main can open: said on the thumbnail, never read.
  const known = (f: File) => f.type === 'image/png' || f.type === 'image/jpeg'
  for (const f of images) {
    const id = nextId++
    shots.value = [...shots.value, { id, name: f.name || 'Pasted screenshot', thumb: URL.createObjectURL(f), image: '', state: 'waiting' }]
    if (!known(f)) { patch(id, { state: 'format' }); continue }
    readFile(f)
      .then(url => { patch(id, { image: url }); readNext().catch(() => {}) })
      .catch(() => patch(id, { state: 'error' }))
  }
  return images.length > 0
}

function patch (id: number, change: Partial<Shot>) {
  shots.value = shots.value.map(s => s.id === id ? { ...s, ...change } : s)
}

// One picture at a time: main reads a 1440p shot in about a fifth of a second.
let busy = false
async function readNext () {
  if (busy || !props.model) return
  const s = shots.value.find(s => s.state === 'waiting' && s.image)
  if (!s) return
  busy = true
  patch(s.id, { state: 'reading' })
  try {
    const p = await prepare(props.model)
    const res = await hostRequest('atlas-shot-read', { image: s.image, probes: p.probes, extra: p.extra }) as
      { ok: true, lit: boolean[], extraLit: boolean[] } | { ok: false, reason: string }
    if (!shots.value.some(x => x.id === s.id)) return
    // The picture is kept until imported: new tree data reads it again.
    if (res.ok) patch(s.id, { state: 'ok', lines: res.extraLit, rings: res.lit })
    else patch(s.id, { state: res.reason === 'no-tree' ? 'none' : res.reason === 'format' || res.reason === 'too-big' ? res.reason : 'error' })
  } catch {
    patch(s.id, { state: 'error' })
  } finally {
    busy = false
    readNext().catch(() => {})
  }
}

// A new tree (data reloaded): every picture is read again.
watch(() => props.model, (m, old) => {
  if (old && m !== old) shots.value = shots.value.map(s => s.image && s.state !== 'reading' ? { ...s, state: 'waiting', lines: undefined, rings: undefined } : s)
  readNext().catch(() => {})
})

function readOf (list: Shot[]): ShotRead | null {
  if (!prepared || prepared.model !== props.model) return null
  const done = list.filter(s => s.state === 'ok')
  if (!done.length) return null
  return prepared.lib.readShots(prepared.model, prepared.lines, done.map(s => s.lines!), prepared.ringIds, done.map(s => s.rings!))
}

const total = computed(() => readOf(shots.value))
watch(total, (t) => emit('update', t))

// What this picture adds: passives no other picture gave.
function added (s: Shot): { own: number, fresh: number } {
  const own = readOf([s])?.nodes.length ?? 0
  const others = shots.value.filter(x => x.id !== s.id)
  if (!others.some(x => x.state === 'ok')) return { own, fresh: own }
  const without = readOf(others)?.nodes.length ?? 0
  return { own, fresh: (total.value?.nodes.length ?? 0) - without }
}

function caption (s: Shot): string {
  if (s.state === 'waiting' || s.state === 'reading') return 'Reading…'
  if (s.state === 'none') return 'No atlas tree'
  if (s.state === 'format') return 'PNG or JPEG only'
  if (s.state === 'too-big') return 'Too big'
  if (s.state === 'error') return 'Couldn\'t read'
  const { own, fresh } = added(s)
  const n = `${own} ${own === 1 ? 'passive' : 'passives'}`
  return fresh === own ? n : `${n}, ${fresh} new`
}

function captionClass (s: Shot): string {
  return s.state === 'ok' ? 'w-up' : BAD.has(s.state) ? 'w-down' : 'w-faint'
}

function remove (id: number) {
  const s = shots.value.find(s => s.id === id)
  if (s) URL.revokeObjectURL(s.thumb)
  shots.value = shots.value.filter(s => s.id !== id)
}

function clear () {
  for (const s of shots.value) URL.revokeObjectURL(s.thumb)
  shots.value = []
}

function pick () { input.value?.click() }
function picked () {
  const el = input.value
  if (el?.files) add(el.files)
  if (el) el.value = ''
}

onBeforeUnmount(clear)

// Still reading: importing now would leave those pictures out.
const pending = computed(() => shots.value.some(s => s.state === 'waiting' || s.state === 'reading'))
watch(pending, (p) => emit('pending', p), { immediate: true })

defineExpose({ add, clear })
</script>

<style module>
.tray { display: flex; flex-direction: column; gap: 4px; }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }
.shot {
  position: relative;
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  overflow: hidden;
  background: #000;
}
.shot img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
.bad img { opacity: 0.4; filter: grayscale(1); }
.cap {
  padding: 1px 4px;
  font-size: var(--w-fs-xs);
  background: var(--w-panel-2);
  border-top: 1px solid var(--w-line);
}
.remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  display: grid;
  place-items: center;
  font-size: var(--w-fs-xs);
  color: var(--w-fg);
  background: rgb(0 0 0 / 0.65);
  border-radius: 2px;
}
</style>
