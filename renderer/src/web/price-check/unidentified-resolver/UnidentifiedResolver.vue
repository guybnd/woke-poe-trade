<template>
  <!-- woke: the guess from the art, with a way to change it (WOKEPOET-481). -->
  <div v-if="strip" :class="$style.strip" data-testid="unid-guess">
    <img :src="strip.icon" :class="$style.stripIcon" alt="" />
    <div :class="$style.stripText">
      <b>{{ strip.byYou ? 'Your pick' : 'Guessed from the art' }}</b>
      <span>{{ candidates.length }} {{ baseType }} uniques<template v-if="!strip.byYou"> compared</template></span>
    </div>
    <button type="button" class="btn" :class="$style.change" data-testid="unid-guess-change" @click="listOpen = !listOpen">
      {{ listOpen ? 'Close' : 'Change' }}
    </button>
  </div>
  <div v-if="pickerShown" class="layout-column" data-testid="unid-picker">
    <div class="m-4 mb-2 py-1 px-2 bg-gray-900 rounded">
      {{ t('item.identification', [baseType]) }}
    </div>
    <div v-if="note" :class="$style.note" data-testid="unid-guess-note">{{ note }}</div>
    <div class="grid grid-cols-2 gap-2 overflow-auto pb-4 px-4">
      <div v-for="row in rows" :key="row.info.refName" class="flex">
        <button type="button" :class="[$style.tile, row.best && $style.best]" class="bg-gray-700 rounded flex gap-x-3 items-center p-2 w-full" @click="select(row.info, true)">
          <img :src="row.info.icon" class="w-12" alt="" />
          <div class="leading-tight text-left min-w-0 flex-1">
            <div v-item-tip="{ name: row.info.refName }">{{ row.info.name }}</div>
            <div :class="$style.sub">
              <span v-if="row.best">best match</span>
              <span v-if="row.price" class="ml-auto">{{ row.price }}</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
  <div v-else-if="strip && listOpen" :class="$style.list" data-testid="unid-guess-list">
    <button v-for="row in rows" :key="row.info.refName" type="button"
      :class="[$style.row, row.info.refName === currentRef && $style.on]" @click="select(row.info, true)">
      <img :src="row.info.icon" alt="" />
      <span v-item-tip="{ name: row.info.refName }" class="flex-1 min-w-0 truncate text-left">{{ row.info.name }}</span>
      <span v-if="row.price">{{ row.price }}</span>
      <span :class="$style.tag">{{ row.best ? 'match' : '' }}</span>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { BaseType, ITEMS_ITERATOR } from '@/assets/data'
import { ItemRarity, ParsedItem, makeIdentifiedUnique } from '@/parser'
import { vItemTip } from '@/web/woke/ui/tooltip/item-tip'
import { usePoeninja, displayRounding } from '@/web/background/Prices'
import { exactDetailsId } from '../trends/getDetailsId'
import { hostRequest } from '@/web/woke/shared/host'

// poecdn icon links carry the item's size: /gen/image/<base64 of [.., .., { w, h }]>/...
function oneSlotIcon (url: string): boolean {
  const m = /\/gen\/image\/([A-Za-z0-9_-]+)/.exec(url)
  if (!m) return false
  try {
    const opts = (JSON.parse(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))) as unknown[])[2] as { w?: number, h?: number }
    return opts.w === 1 && opts.h === 1
  } catch {
    return false
  }
}

type Guess = { state: 'reading' } | { state: 'none' } | { state: 'ranked', order: string[], sure: boolean }

export default defineComponent({
  directives: { itemTip: vItemTip },
  emits: ['identify'],
  props: {
    item: {
      type: Object as PropType<ParsedItem | null>,
      default: null
    }
  },
  setup (props, ctx) {
    const { findPriceByQuery, autoCurrency } = usePoeninja()
    // The unidentified item this check started from, and what was made of it.
    const origin = shallowRef<ParsedItem | null>(null)
    const made = shallowRef<{ item: ParsedItem, byYou: boolean } | null>(null)
    const guess = ref<Guess>({ state: 'none' })
    const listOpen = ref(false)
    let ask = 0

    function isUnidUnique (item: ParsedItem | null): item is ParsedItem {
      return item != null && item.rarity === ItemRarity.Unique && item.isUnidentified && !item.info.unique
    }

    const candidates = computed<BaseType[]>(() => {
      const from = origin.value
      if (!from) return []
      const baseType = from.info.refName
      const possible: BaseType[] = []
      for (const match of ITEMS_ITERATOR(JSON.stringify(baseType))) {
        if (match.namespace === 'UNIQUE' && match.unique!.base === baseType) {
          // TODO currently ignoring variants
          if (!possible.some(unique => unique.refName === match.refName)) {
            possible.push(match)
          }
        }
      }
      return possible
    })

    function select (info: BaseType, byYou: boolean) {
      if (!origin.value) return
      const item = makeIdentifiedUnique(info, origin.value)
      // A guess still on its way mustn't replace the user's own pick.
      if (byYou) ask++
      made.value = { item, byYou }
      listOpen.value = false
      ctx.emit('identify', item)
    }

    watch(() => props.item, (item) => {
      if (made.value && item === made.value.item) return
      made.value = null
      listOpen.value = false
      if (!isUnidUnique(item)) {
        origin.value = null
        guess.value = { state: 'none' }
        return
      }
      origin.value = item
      const list = candidates.value
      if (list.length === 1) {
        select(list[0], false)
        return
      }
      // The art is read from one slot: big items (armour, weapons) get the list.
      if (!list.every(c => oneSlotIcon(c.icon))) {
        guess.value = { state: 'none' }
        return
      }
      guess.value = { state: 'reading' }
      const id = ++ask
      hostRequest('unid-art-guess', { itemText: item.rawText, candidates: list.map(c => ({ name: c.refName, icon: c.icon })) }, 10_000)
        .then(res => {
          if (id !== ask || origin.value !== item || props.item !== item) return
          if (!res.ranked) {
            guess.value = { state: 'none' }
            return
          }
          const order = res.ranked.map(r => r.name)
          guess.value = { state: 'ranked', order, sure: res.sure }
          const best = list.find(c => c.refName === order[0])
          if (res.sure && best) select(best, false)
        })
        .catch(() => {
          if (id === ask && origin.value === item) guess.value = { state: 'none' }
        })
    }, { immediate: true })

    function price (info: BaseType): { chaos: number, text: string } | null {
      if (!origin.value) return null
      const q = exactDetailsId(makeIdentifiedUnique(info, origin.value))
      const chaos = q ? findPriceByQuery(q)?.chaos : null
      if (!chaos) return null
      const p = autoCurrency(chaos)
      return { chaos, text: `${displayRounding(p.min)}${p.currency === 'div' ? ' div' : 'c'}` }
    }

    // Best match first when the art was read, else the dearest first.
    const rows = computed(() => {
      const g = guess.value
      const list = candidates.value.map(info => {
        const p = price(info)
        return { info, chaos: p?.chaos ?? 0, price: p?.text ?? null, best: false }
      })
      if (g.state === 'ranked') {
        const rank = (name: string) => { const i = g.order.indexOf(name); return i < 0 ? 999 : i }
        list.sort((a, b) => rank(a.info.refName) - rank(b.info.refName))
        if (list.length) list[0].best = true
      } else {
        list.sort((a, b) => b.chaos - a.chaos)
      }
      return list
    })

    const pickerShown = computed(() => isUnidUnique(props.item) && origin.value === props.item && candidates.value.length > 1)

    const strip = computed(() => {
      const m = made.value
      if (!m || m.item !== props.item || candidates.value.length < 2) return null
      return { icon: m.item.info.icon, byYou: m.byYou }
    })

    const note = computed(() => {
      const g = guess.value
      if (g.state === 'reading') return 'Reading the art…'
      if (g.state === 'ranked' && !g.sure) return 'Not sure from the art: best matches first.'
      return null
    })

    const { t } = useI18n()

    return {
      t,
      candidates,
      rows,
      pickerShown,
      strip,
      note,
      listOpen,
      currentRef: computed(() => props.item?.info.refName),
      baseType: computed(() => origin.value?.info.name ?? ''),
      select
    }
  }
})
</script>

<style module>
.strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 1rem;
  background: var(--w-pc-well, var(--w-panel-solid));
  border-bottom: 1px solid var(--w-line);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
}
.stripIcon { width: 30px; height: 30px; }
.stripText { display: flex; flex-direction: column; flex: 1; min-width: 0; line-height: 1.2; }
.stripText span { color: var(--w-dim); font-size: var(--w-fs-sm); }
.change { flex: none; }
.note { margin: 0 1rem 0.5rem; color: var(--w-dim); font-size: var(--w-fs-sm); }
.tile { border: 1px solid transparent; }
.best { border-color: var(--w-accent); }
.sub { display: flex; gap: 6px; color: var(--w-dim); font-size: var(--w-fs-sm); font-variant-numeric: tabular-nums; }
.list { display: flex; flex-direction: column; max-height: 16rem; overflow-y: auto; border-bottom: 1px solid var(--w-line); }
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 1rem;
  border-bottom: 1px solid var(--w-line-soft);
  color: var(--w-fg);
  font-size: var(--w-fs-md);
  font-variant-numeric: tabular-nums;
}
.row:hover { background: var(--w-accent-soft); }
.row img { width: 24px; height: 24px; }
.on { box-shadow: inset 3px 0 0 var(--w-accent); }
.tag { width: 3rem; text-align: right; color: var(--w-dim); font-size: var(--w-fs-sm); }
</style>
