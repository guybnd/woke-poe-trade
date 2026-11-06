<template>
  <div v-if="details && (tree || links.length || buys.length || rewards.length || nextGem)" :class="$style.build">
    <a v-if="showTree && tree && safeUrl(tree.url)" :href="safeUrl(tree.url)" target="_blank" class="block w-trunc w-accent hover:underline">
      <i class="fas fa-external-link-alt text-xs" /> Tree: {{ tree.title }}
    </a>
    <template v-if="buys.length">
      <div :class="$style.k">In town · buy from {{ buyNpcs }}</div>
      <div v-for="b in buys" :key="b.name" :class="$style.row">
        <button v-if="tickable" class="w-icon-btn" :class="$style.tick" title="Got it: stop listing this gem" @click="markGot([b.name])">
          <i class="far fa-square text-xs" />
        </button>
        <span v-item-tip="gemTip(b.name)" class="w-rarity-gem w-trunc">{{ b.name }}</span>
        <span class="ml-auto w-dim text-xs whitespace-nowrap" :title="`Unlocked by ${b.quest} (Act ${b.act})`">
          <span v-if="level != null && b.requiredLevel > level" class="w-accent">at lv {{ b.requiredLevel }} · </span>{{ b.npc }}
        </span>
      </div>
    </template>
    <div v-else-if="nextGem" class="w-trunc" :title="nextGem.source ?? undefined">
      <span class="w-dim">Next gem</span> <span v-item-tip="gemTip(nextGem.name)" class="w-rarity-gem">{{ nextGem.name.replace(/ Support$/, '') }}</span>
      <span class="w-num w-faint"> · lv {{ nextGem.requiredLevel }}</span>
      <div v-if="nextGem.source" class="w-dim text-xs w-trunc">{{ nextGem.source }}</div>
    </div>
    <template v-if="rewards.length">
      <div :class="$style.k">Quest rewards this act</div>
      <div v-for="r in rewards" :key="r.quest" :class="$style.row">
        <button v-if="tickable" class="w-icon-btn" :class="$style.tick" title="Taken: stop listing these" @click="markGot(r.gems)">
          <i class="far fa-square text-xs" />
        </button>
        <span class="w-rarity-gem w-trunc"><template v-for="(g, gi) in r.gems" :key="g"><template v-if="gi"> or </template><span v-item-tip="gemTip(g)">{{ g }}</span></template></span>
        <span class="ml-auto w-dim text-xs w-trunc" :class="$style.quest">{{ r.quest }}</span>
      </div>
    </template>
    <template v-if="links.length">
      <div :class="$style.k">Your links<template v-if="linkSet"> · {{ linkSet }}</template></div>
      <div v-for="(l, i) in links" :key="i" :class="$style.row" class="items-center">
        <SocketDots :colours="l.colours" />
        <span class="w-rarity-gem"><template v-for="(n, ni) in l.names" :key="n"><template v-if="ni"> · </template><span v-item-tip="gemTip(n)">{{ n.replace(/ Support$/, '') }}</span></template></span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// The active PoB build in the campaign card: gems to buy in this town (or
// the next gem), quest rewards this act, and your links for this level.
import { computed } from 'vue'
import { saveConfig } from '@/web/Config'
import { useActiveBuild } from '../pob-builds/active'
import { actRewards, linkColours, linkGroups, loadoutOf, orderedGems, relevantGems, skillSetsOf, townBuys } from '../pob-builds/build-model'
import { gemData, nextGems } from '../pob-builds/gems'
import SocketDots from '../pob-builds/SocketDots.vue'
import { vItemTip } from '../ui'
import { isTown } from './log-parse'
import type { CampaignWidget } from './widget'

// PoB leaves "Support" off some names; the tooltip's data has the game's own.
function gemTip (name: string) {
  return { name: gemData(name)?.name ?? name, type: 'SkillGem', noPrice: true }
}

const props = withDefaults(defineProps<{
  config: CampaignWidget
  // Clicks reach the overlay (it's open): gems can be ticked off.
  tickable?: boolean
  showTree?: boolean
  maxLinks?: number
}>(), { tickable: false, showTree: true, maxLinks: 2 })

const build = useActiveBuild()
const s = computed(() => props.config.state)
const level = computed(() => s.value.level)
const details = computed(() => props.config.showBuild ? build.details.value : null)
const loadout = computed(() => details.value ? loadoutOf(details.value, s.value.level, s.value.act, build.loadout.value) : null)
const tree = computed(() => loadout.value?.tree ?? null)
const got = computed(() => s.value.gemsGot ?? [])
const campaignAct = computed(() => (s.value.act != null && s.value.act <= 10) ? s.value.act : null)

const buys = computed(() => (details.value && campaignAct.value != null && isTown(s.value.areaId))
  ? townBuys(details.value, build.className.value, s.value.level, campaignAct.value, got.value, build.loadout.value).slice(0, 6)
  : [])
const buyNpcs = computed(() => [...new Set(buys.value.map(b => b.npc))].join(', '))
const rewards = computed(() => (details.value && campaignAct.value != null)
  ? actRewards(details.value, build.className.value, s.value.level, campaignAct.value, got.value, build.loadout.value).slice(0, 3)
  : [])

// Out of town: the next gem the build uses that you can't use yet.
const nextGem = computed(() => {
  if (!details.value || campaignAct.value == null) return null
  const lvl = s.value.level ?? 1
  const names = relevantGems(details.value, s.value.level, s.value.act, build.loadout.value).filter(n => !got.value.includes(n))
  return nextGems(details.value, lvl, build.className.value, names).find(g => g.requiredLevel > lvl) ?? null
})

const picked = computed(() => loadout.value?.skillSet ?? null)
const linkSet = computed(() => (picked.value?.byStage || (details.value ? skillSetsOf(details.value).length : 0) > 1) ? picked.value?.item.title ?? '' : '')
const links = computed(() => picked.value
  ? linkGroups(picked.value.item.groups, props.maxLinks).map(g => ({
      colours: linkColours(g),
      names: orderedGems(g).map(x => gemData(x.name)?.name ?? x.name)
    }))
  : [])

function markGot (names: string[]) {
  const state = props.config.state
  state.gemsGot = [...(state.gemsGot ?? []).filter(n => !names.includes(n)), ...names]
  saveConfig()
}

// Tree links come from build files, which may be shared by others.
function safeUrl (url: string) {
  return /^https?:\/\//i.test(url) ? url : undefined
}
</script>

<style module>
.build {
  margin-top: 4px;
  border-top: 1px solid var(--w-line);
  padding-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.k {
  padding-top: 3px;
  font-size: var(--w-fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--w-faint);
}
.row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}
.tick { width: 16px; height: 16px; flex: none; }
.quest { max-width: 45%; }
</style>
