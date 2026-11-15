<template>
  <WPanel title="Filter rule for this item" size-key="sample" width="27rem" max-height="85vh">
    <template #actions>
      <span class="w-faint text-xs">{{ store.doc.value?.strictness ?? '' }} {{ store.doc.value?.version ?? '' }}</span>
    </template>

    <template v-if="store.wrongFilterInGame.value" #banner>
      <WBanner tone="warn">Your changes won't show in game: it's using "{{ store.gameFilter.value.name }}", not your saved copy.
        <template v-if="config.reloadViaChat" #actions><WButton size="sm" variant="primary" @click="store.reloadInGame(true)">Use mine in game</WButton></template>
      </WBanner>
    </template>
    <template v-else-if="gameMatch" #banner>
      <WBanner tone="warn">Your game is still on an older version of this filter. There, this item {{ gameVerdict }}. {{ store.gameFileOld.value ? 'Save to bring it up to date.' : 'Reload it to use this one.' }}
        <template #actions>
          <WButton v-if="store.gameFileOld.value" size="sm" variant="primary" :disabled="store.saving.value" @click="store.save({ reloadNow: true })">Save</WButton>
          <WButton v-else-if="config.reloadViaChat" size="sm" variant="primary" @click="store.reloadInGame(true)">Reload</WButton>
        </template>
      </WBanner>
    </template>

    <div :class="$style.body">
      <div class="flex items-center gap-2">
        <span :class="$style.itemName" class="w-trunc grow">{{ facts.name || facts.baseType }}</span>
        <label class="flex items-center gap-1 text-xs w-dim" title="AreaLevel conditions use this. It follows the last map or zone you entered.">
          Area lvl
          <input v-model.number="areaLevelModel" type="number" min="1" max="86" :class="$style.num">
        </label>
      </div>

      <div :class="$style.verdict">
        <div class="flex items-center gap-2">
          <span :class="verdict.shown ? 'w-up' : 'w-down'" :style="{ fontSize: 'var(--w-fs-lg)' }">{{ verdict.shown ? '✓ Shows' : '✗ Hidden' }}</span>
          <LabelPreview :text="facts.baseType ?? facts.name" :actions="match.actions" :visibility="match.visibility" :scale="1.15" />
        </div>
        <div class="text-xs w-dim">{{ whyLine }}</div>
        <div v-for="u in match.uncertain.slice(0, 2)" :key="u.block.index" class="text-xs" style="color: var(--w-warn);">
          Might be caught earlier by {{ placeOf(u.block) }} (can't tell {{ unknownKeys(u).join(', ') }} from the copy).
        </div>
      </div>

      <div v-if="match.final" :class="$style.keys" role="toolbar" aria-label="Quick fixes">
        <button v-for="q in quick" :key="q.key" type="button" class="w-focusable" :class="[$style.key, { [$style.keyOff]: q.disabled }]"
          :disabled="q.disabled" :title="q.title" @click="q.run()">
          <span :class="$style.cap" :style="focused ? '' : 'opacity: .55'">{{ q.key }}</span>
          <span>{{ q.label }}</span>
        </button>
      </div>
      <div v-if="match.final && !focused" class="text-xs w-faint" style="margin-top: -8px;">Move the mouse onto this card, then press 1-5.</div>

      <template v-if="match.final">
        <div v-if="ladderRows.length" :class="$style.section">
          <div class="w-group-label" :class="$style.label">{{ hasPriceLadder ? 'Value tier' : 'Tier' }}</div>
          <button v-for="t in ladderRows" :key="t.tier" type="button" :class="[$style.tierRow, { [$style.current]: t.current }]"
            :title="t.current ? 'Where it is now' : `Move it here (${tierLabel(t.tier)})`" @click="moveTo(t.tier)">
            <span :class="$style.tierName">{{ t.label }}<small v-if="t.note">{{ t.note }}</small></span>
            <LabelPreview :text="facts.baseType ?? ''" :actions="t.actions" :visibility="t.visibility" :extras="false" />
            <span class="grow" />
            <span class="text-xs" :class="t.statusClass">{{ t.status }}</span>
          </button>
        </div>
        <div v-if="ladderRows.length" :class="$style.fold">
          <button type="button" :class="$style.foldHead" @click="open.grid = !open.grid">
            <span>By strictness</span><span class="w-faint">{{ open.grid ? '▾' : '›' }}</span>
          </button>
          <template v-if="open.grid">
            <table :class="$style.grid">
              <thead>
                <tr>
                  <th />
                  <th v-for="(s, l) in LEVEL_SHORT" :key="s" :class="{ [$style.now]: l === level }" :title="LEVEL_NAMES[l]">{{ s }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in gridRows" :key="r.tier" :class="{ [$style.gridCur]: r.current }">
                  <td>{{ r.label }}<span v-if="r.current" class="w-accent"> ◂</span></td>
                  <td v-for="(st, l) in r.states" :key="l" :class="{ [$style.now]: l === level }" :title="`${LEVEL_NAMES[l]}: ${st === 'shows' ? 'shows' : st === 'hidden' ? 'hidden' : 'rule off'}`">
                    <span :class="[$style.dot, st === 'hidden' && $style.dotHidden, st === 'off' && $style.dotOff]" />
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="text-xs w-faint">● shows · ○ hidden · – rule off at that level.{{ verdict.source === 'safety' ? ' Your safety net shows it at every level.' : '' }}</div>
          </template>
        </div>

        <div v-if="!ladderRows.length && !isOwn && !final.tier?.startsWith('#') && final.type !== SAFETY_RULE_TYPE" class="text-xs w-dim">
          This rule doesn't list items by name, so it can't move tiers. Change its look, or give the item its own rule.
        </div>

        <div v-if="specialRows.length" :class="$style.fold">
          <button type="button" :class="$style.foldHead" @click="open.special = !open.special">
            <span>Special rules ({{ specialRows.length }})</span><span class="w-faint">{{ open.special ? '▾' : '›' }}</span>
          </button>
          <template v-if="open.special">
            <div class="text-xs w-faint">The item only lands here with more than its name.</div>
            <button v-for="t in specialRows" :key="t.tier" type="button" :class="[$style.tierRow, { [$style.current]: t.current }]"
              :title="t.current ? 'Where it is now' : 'Move it here'" @click="moveTo(t.tier)">
              <span :class="$style.specialName">{{ t.label }}<small v-if="t.needs">{{ t.needs }}</small></span>
              <span class="grow" />
              <span class="text-xs" :class="t.statusClass">{{ t.status }}</span>
            </button>
          </template>
        </div>

        <div :class="$style.fold">
          <button type="button" :class="$style.foldHead" @click="open.rule = !open.rule">
            <span>Rule: {{ placeOf(final) }}</span><span class="w-faint">{{ final.added ? 'added' : `line ${final.line}` }} {{ open.rule ? '▾' : '›' }}</span>
          </button>
          <template v-if="open.rule">
            <div :class="$style.conds">
              <div v-for="(c, i) in match.final.conditions" :key="i" class="w-trunc">
                <span :class="tri(c.result).cls">{{ tri(c.result).icon }}</span>
                {{ conditionText(c.condition) }}
              </div>
            </div>
            <div v-if="match.layers.length" class="text-xs w-dim">
              Also styled by: {{ match.layers.map(l => placeOf(l.block)).join(', ') }}
            </div>
          </template>
        </div>

        <div v-if="alsoIn.length" :class="$style.fold">
          <button type="button" :class="$style.foldHead" @click="open.also = !open.also">
            <span>Also listed in {{ alsoIn.length }} other {{ alsoIn.length === 1 ? 'rule' : 'rules' }}</span><span class="w-faint">{{ open.also ? '▾' : '›' }}</span>
          </button>
          <div v-if="open.also" class="flex flex-wrap items-center gap-1">
            <WChip v-for="a in alsoIn" :key="a.type + a.tier" clickable @click="emit('open-editor', { type: a.type, tier: a.tier })">{{ placeOf(a) }}</WChip>
          </div>
        </div>

        <div ref="lookSection" :class="$style.section">
          <div class="w-group-label" :class="$style.label">Change the look</div>
          <WSegmented v-if="!isOwn" v-model="scope" :options="scopeOptions" />
          <StyleEditor :source="origin.type && origin.tier ? store.sourceLook(origin.type, origin.tier) : null" :look="editLook" :visibility="editVisibility" :preview-text="facts.baseType ?? facts.name"
            :copy-from="scope === 'tier' ? [] : copyRows"
            @patch="onPatch" @visibility="onVisibility" />
          <WButton v-if="isOwn" size="sm" variant="ghost" icon="fas fa-undo" @click="removeOwnRule">Remove my own rule for this item</WButton>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="flex items-center gap-2 w-full">
        <span class="text-xs grow" :class="store.error.value ? '' : 'w-dim'" :style="store.error.value ? 'color: var(--w-down)' : ''">
          {{ store.error.value ?? (store.dirty.value ? 'Unsaved changes' : (store.pendingReload.value ? 'Saved, press Reload now to use it' : (store.lastSaved.value ? 'Saved' : ''))) }}
        </span>
        <WButton size="sm" variant="ghost" @click="emit('open-editor')">Open editor</WButton>
        <WButton v-if="config.reloadViaChat && store.outputSaved.value" size="sm" variant="ghost" title="Type /itemfilter in chat now to reload the saved filter" @click="store.reloadInGame(true)">Reload now</WButton>
        <WButton size="sm" variant="primary" :disabled="store.saving.value" @click="store.save({ reloadNow: true })">{{ config.reloadViaChat ? 'Save + reload' : 'Save' }}</WButton>
      </div>
    </template>
  </WPanel>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { WPanel, WBanner, WButton, WSegmented, WChip, toast } from '../ui'
import { SAFETY_LOOK, SAFETY_RULE_TYPE } from './safety'
import { hasSpecialLabel, hideFromLabel, isPlainTier, levelStates, ladderLabel, levelOf, priceLadder, specialLabel, tierNeeds, verdictOf } from './item-panel'
import LabelPreview from './LabelPreview.vue'
import StyleEditor from './StyleEditor.vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import type { ItemFacts } from './item-facts'
import { sameRule } from './match'
import type { BlockMatch, MatchResult, Tri } from './match'
import { formatCondition, ruleLabel, tierName } from './parse'
import { tierLabel } from './names'
import type { FilterCondition, Visibility } from './parse'
import { LEVEL_NAMES, LEVEL_SHORT } from './strictness'
import { OWN_RULE_TYPE, blocksOf, conditionSignature, moveTargets, readStyle } from './edits'
import type { StylePatch } from './edits'
import { ownActions } from './look'
import { findBase, groupName } from './groups'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  facts: ItemFacts
  match: MatchResult
  // Set when the game's file is older and does otherwise with this item.
  gameMatch?: MatchResult | null
  areaLevel: number
}>()

const gameVerdict = computed(() => {
  const g = props.gameMatch
  if (!g) return ''
  const b = g.final?.block
  const rule = b ? placeOf(b) : 'no rule, the game default'
  if (g.visibility === 'Hide') return `is hidden: ${rule}`
  // Shown either way, so it's the look or sound that differs.
  if (props.match.visibility !== 'Hide' && sameRule(g, props.match)) return `shows with that version's look or sound: ${rule}`
  return `shows: ${rule}`
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-editor', at?: { type: string, tier: string }): void
  (e: 'area-level', v: number): void
}>()

const areaLevelModel = computed({
  get: () => props.areaLevel,
  // A cleared box gives '' (read as area level 0): ignore it.
  set: (v: number | string) => {
    const n = Number(v)
    if (v !== '' && Number.isFinite(n) && n >= 1 && n <= 86) emit('area-level', Math.round(n))
  }
})

const placeOf = (r: { type: string | null, tier: string | null }) => ruleLabel(r.type, r.tier)

const final = computed(() => props.match.final!.block)
const isOwn = computed(() => final.value.type === OWN_RULE_TYPE)
const base = computed(() => props.facts.baseType ?? '')

// The NeverSink rule behind an own rule, so moves and tier edits still work.
const ownEdit = computed(() => props.config.edits.find(e => e.kind === 'item' && e.id === final.value.editId) as Extract<typeof props.config.edits[number], { kind: 'item' }> | undefined)
// Says which block of the tier this item hit, for the own rule to copy.
const anchor = computed(() => isOwn.value ? ownEdit.value?.anchor : conditionSignature(final.value))
const origin = computed(() => isOwn.value && ownEdit.value
  ? { type: ownEdit.value.type, tier: ownEdit.value.tier }
  : { type: final.value.type ?? '', tier: final.value.tier ?? '' })

function tierInfo (tier: string) {
  const doc = props.store.doc.value!
  const all = blocksOf(doc, origin.value.type, tier)
  const live = all.filter(b => !b.disabled)
  const blocks = live.length ? live : all
  const first = blocks[0]
  const count = blocks.reduce((n, b) => n + (b.conditions.find(c => c.key === 'BaseType' && c.op === '==')?.values.length ?? 0), 0)
  return { tier, actions: first?.actions ?? [], visibility: first?.visibility ?? 'Show', count, look: readStyle(first ? ownActions(first) : []), off: !live.length }
}

const moveTiers = computed(() => {
  const doc = props.store.doc.value
  if (!doc || isOwn.value || !base.value) return []
  const hasBase = final.value.conditions.some(c => c.key === 'BaseType' && c.op === '==' && c.values.includes(base.value))
  if (!hasBase) return []
  return moveTargets(doc, origin.value.type).map(tierInfo)
})

const copyFrom = computed(() => {
  const doc = props.store.doc.value
  if (!doc || !origin.value.type) return []
  return moveTargets(doc, origin.value.type).map(t => tierInfo(t))
})

// Other rules that list this base by name (e.g. single vs stacked currency).
const alsoIn = computed(() => {
  const doc = props.store.doc.value
  if (!doc || !base.value) return []
  return findBase(doc, base.value)
    .filter(r => r.base === base.value && !(r.type === final.value.type && r.tier === final.value.tier))
    .slice(0, 4)
})

// ---- verdict and tier rows ----

const level = computed(() => levelOf(props.store.doc.value))
const verdict = computed(() => verdictOf(props.match, level.value))
const open = reactive({ special: false, rule: false, also: false, grid: false })

type Row = ReturnType<typeof tierInfo> & { label: string, note: string, needs: string, current: boolean, status: string, statusClass: string }

function row (t: ReturnType<typeof tierInfo>, label: string): Row {
  const doc = props.store.doc.value!
  const first = blocksOf(doc, origin.value.type, t.tier).find(b => !b.disabled)
  const current = t.tier === final.value.tier
  const hidden = t.visibility === 'Hide'
  const from = first && !hidden && !t.off ? hideFromLabel(first, level.value) : null
  return {
    ...t,
    label,
    note: from ? `hidden from ${from}` : '',
    needs: hasSpecialLabel(t.tier) ? '' : tierNeeds(doc, origin.value.type, t.tier),
    current,
    status: current ? 'Now' : t.off ? 'Off here' : hidden ? 'Hidden' : 'Shows',
    statusClass: current ? 'w-accent' : t.off || hidden ? 'w-down' : 'w-up'
  }
}

const split = computed(() => {
  const doc = props.store.doc.value
  if (!doc) return { ladder: [] as Row[], special: [] as Row[], priced: false }
  const plain = moveTiers.value.filter(t => isPlainTier(doc, origin.value.type, t.tier))
  const ranked = priceLadder(origin.value.type, plain.map(t => t.tier))
  const ladderTiers = ranked ?? plain.map(t => t.tier)
  const ladder = ladderTiers.map((tier, i) => row(moveTiers.value.find(t => t.tier === tier)!, ranked ? ladderLabel(i, ladderTiers.length) : tierLabel(tier)))
  // Rules off at this strictness only add noise here.
  const special = moveTiers.value.filter(t => !ladderTiers.includes(t.tier) && (!t.off || t.tier === final.value.tier)).map(t => row(t, specialLabel(t.tier)))
  return { ladder, special, priced: ranked != null }
})
const ladderRows = computed(() => split.value.ladder)
const specialRows = computed(() => split.value.special)
const hasPriceLadder = computed(() => split.value.priced)

// Copy-look choices under the same plain names, price tiers first.
const copyRows = computed(() => {
  const named = [...ladderRows.value, ...specialRows.value].map(r => ({ tier: r.tier, look: r.look, label: r.label }))
  return named.length ? [...named, ...copyFrom.value.filter(t => !named.some(n => n.tier === t.tier))] : copyFrom.value
})

const gridRows = computed(() => {
  const doc = props.store.doc.value
  if (!doc) return []
  const rows = [...ladderRows.value]
  const cur = specialRows.value.find(r => r.current)
  if (cur) rows.push(cur)
  return rows.map(r => {
    const all = blocksOf(doc, origin.value.type, r.tier)
    const first = all.find(b => !b.disabled) ?? all[0]
    return { ...r, states: first ? levelStates(first, level.value) : [] }
  })
})

const whyLine = computed(() => {
  const v = verdict.value
  if (v.source === 'none') return 'No rule matches, so it drops with the game\'s default look.'
  if (v.source === 'safety') return `Your price safety net shows it: worth ${props.config.safetyNet.minChaos}c or more.`
  if (v.source === 'own') return v.shown ? 'Your own rule for this item.' : 'Your own rule hides it.'
  if (v.source === 'woke') return `Woke rule: ${placeOf(final.value)}.`
  const here = [...ladderRows.value, ...specialRows.value].find(r => r.current)
  const tier = here?.label ?? tierName(final.value)
  return `NeverSink: ${groupName(final.value.type)} › ${tier}${v.hideFrom ? `, hidden from ${v.hideFrom} up` : ''}.`
})

function moveTo (tier: string) {
  if (tier === final.value.tier) return
  props.store.edit({ kind: 'move', type: origin.value.type, base: base.value, from: final.value.tier ?? '', to: tier })
}

const scope = ref<'item' | 'tier'>('item')
const scopeOptions = computed(() => {
  const count = tierInfo(final.value.tier ?? '').count
  return [
    { value: 'item', label: 'Just this item' },
    { value: 'tier', label: `Whole tier${count ? ` (${count} items)` : ''}` }
  ]
})

// The rule's own style, before the look strip, so edits never compound.
const editLook = computed<StylePatch>(() => readStyle(ownActions(props.match.final!.block)))
const editVisibility = computed<Visibility>(() => final.value.visibility)

function onPatch (patch: StylePatch) {
  if (scope.value === 'tier' && !isOwn.value) {
    props.store.edit({ kind: 'style', type: origin.value.type, tier: origin.value.tier, patch })
  } else {
    props.store.edit({ kind: 'item', type: origin.value.type, tier: origin.value.tier, base: base.value, visibility: editVisibility.value, patch, anchor: anchor.value })
  }
}

function onVisibility (v: Visibility) {
  if (scope.value === 'tier' && !isOwn.value) {
    props.store.edit({ kind: 'visibility', type: origin.value.type, tier: origin.value.tier, visibility: v })
  } else {
    props.store.edit({ kind: 'item', type: origin.value.type, tier: origin.value.tier, base: base.value, visibility: v, patch: {}, anchor: anchor.value })
  }
}

function removeOwnRule () {
  if (ownEdit.value) props.store.removeEdit(ownEdit.value.id)
}

// ---- one-key fixes (1-5) ----

function afterFix (text: string, undo: () => void) {
  toast(text, { undo: () => { undo(); props.store.save() } })
  // Saved now; outside town or hideout it waits for you to press Reload now.
  props.store.save()
}

// Lower/Raise walk the price tiers in rank order (t1, t2...) when the group
// has them, otherwise the tiers in file order.
// The keys walk the Value tier rows as shown when the item is on them.
const ladder = computed(() => {
  const rows = split.value.ladder
  return rows.some(t => t.current) ? rows : moveTiers.value
})
const tierIndex = computed(() => ladder.value.findIndex(t => t.tier === final.value.tier))
const shownNow = computed(() => props.match.visibility !== 'Hide')
const name = computed(() => base.value || props.facts.name)

const quick = computed(() => {
  const i = tierIndex.value
  const lower = i >= 0 ? ladder.value[i + 1] : undefined
  const higher = i > 0 ? ladder.value[i - 1] : undefined
  const canOwn = Boolean(base.value && origin.value.type && origin.value.tier)
  return [
    {
      key: '1',
      label: shownNow.value ? 'Hide' : 'Hidden',
      title: `Hide ${name.value} from now on (own rule, just this item)`,
      disabled: !canOwn || !shownNow.value,
      run: () => afterFix(`Hid ${name.value}`, props.store.editWithUndo({ kind: 'item', type: origin.value.type, tier: origin.value.tier, base: base.value, visibility: 'Hide', patch: {}, anchor: anchor.value }))
    },
    {
      key: '2',
      label: 'Lower',
      title: lower ? `Move to ${tierLabel(lower.tier)}${lower.off ? ' (off at this strictness, so it goes where that tier\'s items go, usually hidden)' : ''}` : 'Already in the lowest tier, or this rule doesn\'t list items by name',
      disabled: !lower,
      run: () => lower && afterFix(`${name.value}: ${tierName(final.value)} → ${tierLabel(lower.tier)}${lower.off ? ' (off at this strictness)' : ''}`, props.store.editWithUndo({ kind: 'move', type: origin.value.type, base: base.value, from: final.value.tier ?? '', to: lower.tier }))
    },
    {
      key: '3',
      label: 'Raise',
      title: higher ? `Move to ${tierLabel(higher.tier)}${higher.off ? ' (off at this strictness, so it goes where that tier\'s items go, usually hidden)' : ''}` : 'Already in the top tier, or this rule doesn\'t list items by name',
      disabled: !higher,
      run: () => higher && afterFix(`${name.value}: ${tierName(final.value)} → ${tierLabel(higher.tier)}${higher.off ? ' (off at this strictness)' : ''}`, props.store.editWithUndo({ kind: 'move', type: origin.value.type, base: base.value, from: final.value.tier ?? '', to: higher.tier }))
    },
    {
      key: '4',
      label: 'Own look',
      title: 'Change the look of just this item below',
      disabled: !canOwn,
      run: () => { scope.value = 'item'; lookSection.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }
    },
    {
      key: '5',
      label: 'Always show',
      title: 'Own rule that shows this item at every strictness and after NeverSink updates',
      disabled: !canOwn || (isOwn.value && ownEdit.value?.visibility === 'Show'),
      run: () => afterFix(`${name.value} always shows`, props.store.editWithUndo({ kind: 'item', type: origin.value.type, tier: origin.value.tier, base: base.value, visibility: 'Show', patch: shownNow.value ? {} : SAFETY_LOOK, anchor: anchor.value, pin: true }))
    }
  ]
})

const lookSection = ref<HTMLElement | null>(null)
const focused = ref(document.hasFocus())
const onFocus = () => { focused.value = true }
const onBlur = () => { focused.value = false }

// Keys reach the overlay only while it has focus, so they never drink a flask.
function onKey (e: KeyboardEvent) {
  if (e.ctrlKey || e.altKey || e.metaKey || e.repeat) return
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
  const q = quick.value.find(x => x.key === e.key)
  if (!q || q.disabled) return
  e.preventDefault()
  q.run()
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('focus', onFocus)
  window.addEventListener('blur', onBlur)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('focus', onFocus)
  window.removeEventListener('blur', onBlur)
})

function tri (r: Tri) {
  if (r === true) return { icon: '✓', cls: 'w-up' }
  if (r === false) return { icon: '✗', cls: 'w-down' }
  return { icon: '?', cls: 'w-faint' }
}

function conditionText (c: FilterCondition): string {
  if (c.key === 'BaseType' && c.values.length > 3) {
    const hit = c.values.find(v => v === base.value || base.value.includes(v))
    return `BaseType ${c.op} … ${hit ? `"${hit}"` : ''} … (${c.values.length} items)`
  }
  return formatCondition(c)
}

function unknownKeys (m: BlockMatch): string[] {
  return [...new Set(m.conditions.filter(c => c.result === null).map(c => c.condition.key))]
}

</script>

<style module>
.body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px var(--w-pad);
}
.itemName {
  font-family: var(--w-head);
  font-size: var(--w-fs-lg);
}
.section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.label {
  padding: 0;
}
.conds {
  font-family: var(--w-mono);
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  line-height: 1.6;
}
.tierRow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 3px 8px;
  background: var(--w-panel-2);
  border: 1px solid var(--w-line-soft);
  border-radius: var(--w-r-sm);
  color: var(--w-fg);
  text-align: left;
  cursor: pointer;
}
.tierRow:hover {
  border-color: var(--w-line-strong);
}
.current {
  background: var(--w-accent-soft);
  border-color: var(--w-line-strong);
}
.tierName {
  width: 5.5rem;
  flex-shrink: 0;
  font-size: var(--w-fs-sm);
  color: var(--w-fg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.verdict {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: var(--w-panel-2);
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-sm);
}
.fold {
  display: flex;
  flex-direction: column;
  gap: 5px;
  border-top: 1px solid var(--w-line-soft);
  padding-top: 6px;
}
.foldHead {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  background: none;
  border: none;
  padding: 0;
  color: var(--w-dim);
  font-size: var(--w-fs-sm);
  text-align: left;
  cursor: pointer;
}
.foldHead:hover {
  color: var(--w-fg);
}
.specialName {
  font-size: var(--w-fs-sm);
  color: var(--w-fg);
  min-width: 0;
}
.specialName small, .tierName small {
  display: block;
  white-space: normal;
  color: var(--w-faint);
  font-size: var(--w-fs-xs);
  line-height: 1.15;
}
.grid {
  border-collapse: collapse;
  font-size: var(--w-fs-xs);
}
.grid th {
  font-weight: normal;
  font-family: var(--w-mono);
  color: var(--w-faint);
  padding: 1px 0;
}
.grid td {
  text-align: center;
  padding: 3px 0;
  border-top: 1px solid var(--w-line-soft);
}
.grid td:first-child {
  text-align: left;
  padding-right: 6px;
  white-space: nowrap;
  color: var(--w-fg);
}
.grid .now {
  background: var(--w-accent-soft);
  color: var(--w-accent);
}
.gridCur td {
  background: var(--w-panel-2);
}
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--w-up);
}
.dotHidden {
  background: transparent;
  border: 1px solid var(--w-faint);
}
.dotOff {
  width: 8px;
  height: 1px;
  border-radius: 0;
  background: var(--w-faint);
}
.keys {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
}
.key {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 2px;
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  background: var(--w-panel-2);
  color: var(--w-fg);
  font-size: var(--w-fs-xs);
  cursor: pointer;
}
.key:hover:not(:disabled) {
  border-color: var(--w-accent);
}
.keyOff {
  opacity: 0.4;
  cursor: default;
}
.cap {
  font-family: var(--w-mono);
  font-weight: 600;
  font-size: var(--w-fs-xs);
  padding: 0 5px;
  border: 1px solid var(--w-line-strong);
  border-bottom-width: 2px;
  border-radius: var(--w-r-sm);
}
.num {
  width: 3.2rem;
  background: var(--w-panel-2);
  color: var(--w-fg);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  padding: 1px 4px;
}
</style>
