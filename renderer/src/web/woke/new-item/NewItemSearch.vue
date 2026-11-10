<template>
  <div class="m-4 flex flex-col gap-2" data-testid="new-item-search">
    <div>
      <div v-if="query.name" class="text-base text-orange-400">{{ query.name }}</div>
      <div class="text-base">{{ query.type }}</div>
    </div>
    <div class="rounded px-2 py-1" style="background: var(--w-panel); border-left: 2px solid var(--w-accent)">
      New item. Searched by name only. Mod filters come with the next item data update.
    </div>
    <div v-if="state === 'loading'" class="w-dim"><i class="fas fa-dna fa-spin" /> Searching…</div>
    <div v-else-if="state === 'error'" class="text-red-400">{{ error }}</div>
    <template v-else>
      <div class="w-dim">{{ total }} listed</div>
      <div v-for="row in rows" :key="row.id" class="flex justify-between gap-2 font-mono text-sm">
        <span>{{ row.priceAmount }} {{ row.priceCurrency }}</span>
        <span class="w-dim truncate">{{ row.relativeDate }}</span>
      </div>
    </template>
    <div><button class="btn" @click="openTrade">Open on trade site</button></div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { AppConfig, poeWebApi } from '@/web/Config'
import { requestResults, requestTradeResultList } from '@/web/price-check/trade/pathofexile-trade'
import type { PricingResult, TradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { newItemTradeBody, newItemTradeUrl } from './query'
import type { NewItemQuery } from './query'

const props = defineProps<{ query: NewItemQuery, league: string }>()

const state = shallowRef<'loading' | 'error' | 'done'>('loading')
const error = shallowRef('')
const total = shallowRef(0)
const rows = shallowRef<PricingResult[]>([])
let run = 0

async function search () {
  const mine = ++run
  state.value = 'loading'
  try {
    const body = newItemTradeBody(props.query) as unknown as TradeRequest
    const found = await requestTradeResultList(body, props.league)
    const listed = found.result.length
      ? await requestResults(found.id, found.result.slice(0, 10), { accountName: AppConfig().accountName })
      : []
    if (mine !== run) return
    total.value = found.total
    rows.value = listed.filter(row => !row.isMine).slice(0, 6)
    state.value = 'done'
  } catch (e) {
    if (mine !== run) return
    error.value = (e as Error).message
    state.value = 'error'
  }
}

function openTrade () {
  window.open(newItemTradeUrl(props.league, props.query, poeWebApi()))
}

watch(() => [props.query, props.league], () => { search() }, { immediate: true })
</script>
