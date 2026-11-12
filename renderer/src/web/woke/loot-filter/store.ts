// Loads the source filter, applies the widget's edits, and saves the result.
import { computed, onUnmounted, shallowRef, ref, watch } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { hostRequest } from '../shared/host'
import { customSoundsIn, installPackSounds } from './sounds'
import { ruleBlocks } from './rules'
import { DUST_ILVL, applyPresetChanges, colourBlindActions, normalizePresets, presetBlocks, presetsOn, scaleVolume } from './presets'
import { dustBases } from '../disenchant/calc'
import { basesWithoutDust, dustUniques } from '../disenchant/data'
import { clearUndoToasts } from '../ui/layer'
import { isTownLike } from '../campaign/log-parse'
import { onGameLog } from '../shared/game-log'
import { parseFilter, serializeFilter } from './parse'
import type { FilterDoc } from './parse'
import { addEdit, applyEdits, blocksOf, nextEditId, readStyle } from './edits'
import type { EditStatus, FilterEdit, NewFilterEdit, StylePatch } from './edits'
import { describeStep, observe, settingsAt } from './timeline'
import type { Settings } from './timeline'
import { HISTORY_SIZE, baseFromCopy, isWokeCopy, outputName } from './widget'
import type { LootFilterWidget } from './widget'
import { buildRuleBlocks, insertBuildBlocks } from './build-rules'
import { useBuildRuleInput } from './build-input'
import { NET_GROUPS, applyPriceMoves, livePriceMoves, lockKey, lockedByEdits, mergeMoves, movesOutOfPlace, planRetier, tierRank } from './economy'
import type { EconomyGroup, PriceMove, RetierPlan } from './economy'
import { SAFETY_RULE_TYPE, auditBases, lastLookup, netFromAudit, safetyBlocks, stackNet, valuableFromAudit, withLast } from './safety'
import { isDismissed } from './health'
import type { BaseVerdict, NetList } from './safety'
import { describeProblem, validateFilter } from './validate'
import type { FilterProblem } from './validate'
import { useFilterPrices } from './prices'
import { publishActiveFilter } from './active-filter'
import { LEVEL_NAMES, clampLevel, ladderTarget, ladderZone, levelForArea, pushArea } from './strictness'
import { toast } from '../ui'

// "1 change", "3 changes".
export const countOf = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

// First line of every file the editor writes; marks a filter as ours.
export const WOKE_MARK = '# WOKE-LOOT-FILTER-EDITOR'

export interface FilterFile { name: string, size: number, mtime: number, online?: boolean, title?: string }

// Short, stable fingerprint of the build rules (kept in config).
function hash (text: string): string {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

function stem (name: string): string {
  return name.replace(/\.filter$/i, '')
}

// Takes a getter: Settings replaces the whole config object while the widget
// stays mounted, so a captured object would go stale (edits lost on save).
export function useLootFilter (cfg: () => LootFilterWidget) {
  const files = shallowRef<FilterFile[]>([])
  const folder = ref('')
  // The untouched NeverSink text the edits apply to.
  const baseText = shallowRef<string | null>(null)
  // True when baseText came from a fresh source file that needs a .bak
  // (overwrite mode).
  const baseNeedsBackup = ref(false)
  const doc = shallowRef<FilterDoc | null>(null)
  const statuses = shallowRef<EditStatus[]>([])
  const buildBlockCount = ref(0)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  // Rules from the active PoB build; part of what "unsaved" compares.
  const buildInput = useBuildRuleInput()
  const buildSig = computed(() => JSON.stringify(buildInput.value ? [buildInput.value, cfg().buildRules] : null))
  // Price moves and the safety net's current list are part of the file too.
  const safetyList = shallowRef<string>('')
  // What the presets added (the cheap currency list follows prices) and how
  // many of NeverSink's rules they adjusted.
  const presetList = shallowRef<string>('')
  const presetChanges = ref(0)
  const prices = useFilterPrices(() => cfg().priceTiers.uniqueRule)
  // Bases for the dust preset's price rule, only while it's on.
  const dustList = computed(() => {
    const d = cfg().presets.dust
    if (!d.on || !d.fromPrices || !prices.items.value.length) return null
    return dustBases(dustUniques(), prices.items.value, d.line, DUST_ILVL, basesWithoutDust())
  })
  // woke: with NeverSink from GitHub, the version, style and level are part
  // of the file as well (a new style used to read "saved" until you saved).
  const sourceSig = () => {
    const ns = cfg().neversink
    return ns.on ? [ns.version, ns.style, ns.level] : []
  }
  // With no league known yet (leagues still loading, or the fetch failed) a move
  // isn't called foreign.
  const inLeague = (m: PriceMove) => !m.league || !prices.currentLeague.value || m.league === prices.currentLeague.value
  // A tier's namesake (Orb of Alchemy in t5alchemy) no longer moves: an old
  // stored move of one is ignored, and dropped on the next apply.
  const activeMoves = () => cfg().priceTiers.on ? livePriceMoves(cfg().priceTiers.moves).filter(inLeague) : []
  // Price moves that took an item out of NeverSink's tier. Set with the doc,
  // so the plan reads both from one rebuild.
  let priceMoved: PriceMove[] = []
  const moveKey = (m: PriceMove) => [m.type, m.base, m.from, m.to]
  const extraSig = () => {
    const parts: unknown[] = [activeMoves().map(moveKey), cfg().safetyNet.on ? safetyList.value : '']
    // Only when used, so turning these features on doesn't flag old saves.
    if (cfg().rules.length) parts.push(cfg().rules)
    if (presetsOn(cfg().presets)) parts.push(cfg().presets, presetList.value)
    const src = sourceSig()
    if (src.length) parts.push(src)
    return hash(JSON.stringify(parts))
  }
  const signature = () => JSON.stringify([cfg().edits, hash(buildSig.value), extraSig()])
  // Everything you changed, leaving out what follows prices by itself.
  const userSig = () => hash(JSON.stringify([cfg().edits, buildSig.value, cfg().priceTiers.on, cfg().priceTiers.moves.map(moveKey), cfg().rules, cfg().sourceName, cfg().sourceOnline, cfg().saveMode, presetsOn(cfg().presets) ? cfg().presets : null, sourceSig()]))
  // The build part is only known once the build file is read, so start from
  // what the last save used.
  const savedEdits = ref(JSON.stringify([cfg().edits, cfg().savedBuildSig ?? hash(buildSig.value), cfg().savedExtraSig ?? extraSig()]))
  // woke: until a save records it, an old config counts as saved if its edits
  // match what the last save wrote.
  const userDirty = () => {
    const saved = cfg().savedUserSig
    if (saved != null) return saved !== userSig()
    try { return JSON.stringify(JSON.parse(savedEdits.value)[0]) !== JSON.stringify(cfg().edits) } catch { return false }
  }
  // Writing the file with nobody asking: only over a file this editor has saved
  // before, with nothing of yours unsaved, and with all your changes in place.
  function mayAutoSave (): boolean {
    return cfg().savedExtraSig != null && !userDirty() && !failed.value.length
  }

  // Prices this old say little: warn, and stop offering moves from them.
  const STALE_HOURS = 24
  const TOO_OLD_HOURS = 72
  const now = ref(Date.now())
  const nowTimer = setInterval(() => { now.value = Date.now() }, 10 * 60 * 1000)
  const priceAgeHours = computed(() => prices.updatedAt?.value != null ? (now.value - prices.updatedAt.value) / 3600000 : null)
  const pricesStale = computed(() => (priceAgeHours.value ?? 0) >= STALE_HOURS)
  const pricesTooOld = computed(() => (priceAgeHours.value ?? 0) >= TOO_OLD_HOURS)
  // Moves made in another league: kept for Undo, but not in the file.
  const otherMoves = computed(() => cfg().priceTiers.on ? cfg().priceTiers.moves.filter(m => !inLeague(m)) : [])
  const movesFromOtherLeague = computed(() => otherMoves.value.length)
  const otherMovesLeague = computed(() => otherMoves.value[0]?.league ?? null)
  // Problems found by the last save attempt.
  const problems = shallowRef<FilterProblem[]>([])
  const safetyCount = ref(0)
  // The file has a newer net list than the game has loaded.
  const netWaitsForReload = ref(false)
  // The source filter is not what the last save was made from.
  const sourceChanged = ref(false)
  // No prices to judge by: the net is on its last list, or empty.
  const netWithoutPrices = computed(() => cfg().safetyNet.on && !prices.safety.value && doc.value != null)
  const lastSaved = ref<number | null>(null)
  // Version of the base file when it was loaded, to flag NeverSink updates.
  const baseVersion = ref<string | null>(null)

  // AreaLevel conditions use the level of the last map/zone entered.
  const areaLevel = ref<number | null>(null)
  // Town or hideout (null until Client.txt shows an area change).
  const inSafeZone = ref<boolean | null>(null)
  // A saved filter waiting for you to press Reload now.
  const pendingReload = ref(false)
  let remindedOfReload = false
  function holdReload () {
    pendingReload.value = true
    remindedOfReload = false
  }
  // How to use a filter that's saved but not reloaded, for a short note.
  const reloadHint = () => cfg().reloadHotkey ? `Press ${cfg().reloadHotkey} to use it.` : 'Click its dock icon to use it.'
  // The area line is written while the loading screen is still up; wait until
  // the zone has loaded.
  const RELOAD_AFTER_LOAD_MS = 4000
  let reloadTimer: ReturnType<typeof setTimeout> | undefined
  // Area levels of the last few maps (or campaign zones), for the strictness ladder.
  const recentAreas = shallowRef<number[]>([])
  // What the ladder would pick now, whether or not it's paused.
  const ladderPick = computed(() => recentAreas.value.length ? levelForArea(cfg().strictAuto.ladder, Math.max(...recentAreas.value)) : null)
  const stopLog = onGameLog((lines) => {
    for (const { ev } of lines) {
      if (ev?.kind !== 'area') continue
      const safe = /town/i.test(ev.areaId) || isTownLike(ev.areaId)
      inSafeZone.value = safe
      if (!safe) {
        areaLevel.value = ev.areaLevel
        if (ladderZone(ev.areaId)) recentAreas.value = pushArea(recentAreas.value, ev.areaLevel)
      }
      clearTimeout(reloadTimer)
      if (safe) {
        // The game rewrites its config now and then, so this is when a filter
        // it couldn't load shows up.
        readGameFilter().catch(() => {})
        reloadTimer = setTimeout(() => {
          if (inSafeZone.value !== true) return
          // The ladder switches only here, in town or hideout, never mid-map.
          if (followLadder()) return
          // A reminder only. GGG's macro rules need every command to come from
          // a key press or click, so a log line or timer must never send one.
          if (pendingReload.value && !remindedOfReload) {
            remindedOfReload = true
            toast(`Loot filter saved. ${reloadHint()}`)
          }
        }, RELOAD_AFTER_LOAD_MS)
      }
    }
  })
  onUnmounted(() => {
    stopLog()
    clearTimeout(reloadTimer)
    clearInterval(nowTimer)
    if (settleTimer) settle()
  })

  const dirty = computed(() => signature() !== savedEdits.value)
  const failed = computed(() => statuses.value.filter(s => !s.ok))
  const updatedSinceSave = computed(() =>
    baseVersion.value != null && cfg().lastVersion != null && baseVersion.value !== cfg().lastVersion)

  // A tier outside the price ranks (exhide and the like) is a deliberate place to
  // put something; a known rank has to be lower to count as moving it down.
  function movedDown (group: EconomyGroup, base: string): boolean {
    const rank = (tier: string) => tierRank(tier, [tier], group)
    return cfg().edits.some(e => {
      if (e.kind !== 'move' || e.base !== base || (e.type !== group.type && !e.type.startsWith(group.type + '->'))) return false
      const to = rank(e.to)
      const from = rank(e.from)
      return to == null || (from != null && to > from)
    })
  }

  const sourceStamp = (text: string) => `${cfg().sourceName}|${hash(text)}`

  // What the net leaves hidden because you said so: "Not for me" on a hidden
  // item, or moving it down yourself.
  function heldBack (v: BaseVerdict): boolean {
    return isDismissed(cfg().netDismissed, v) || movedDown(v.group, v.base)
  }

  // A filter text with everything applied: build rules, price moves, your
  // edits and the safety net. The editor's own doc, and the preview's
  // other strictness levels, are made this way.
  function compose (text: string) {
    const next = parseFilter(text)
    // Build rules go in first, so edits to them (restyles) apply on top.
    const input = buildInput.value
    let buildCount = 0
    if (input) {
      const blocks = buildRuleBlocks(input, cfg().buildRules)
      insertBuildBlocks(next, blocks)
      buildCount = blocks.length
    }
    // Presets' rules, then your own rules above them: yours win.
    const presetTop = presetBlocks(next, cfg().presets, prices.lookup.value, dustList.value, {
      breakdown: cfg().presets.cheapUniques.on ? prices.breakdown.value : null,
      build: input ? { uniqueBases: input.uniqueBases, weaponClasses: input.weaponClasses } : null
    })
    insertBuildBlocks(next, presetTop)
    insertBuildBlocks(next, ruleBlocks(cfg().rules))
    // Price moves next: your own moves (edits) are applied after them and win.
    let movesFit = 0
    let outOfPlace: PriceMove[] = []
    if (activeMoves().length) {
      outOfPlace = movesOutOfPlace(next, activeMoves())
      movesFit = applyPriceMoves(next, activeMoves())
    }
    const isNetEdit = (e: FilterEdit) => e.type === SAFETY_RULE_TYPE
    const results = new Map(applyEdits(next, cfg().edits.filter(e => !isNetEdit(e))).map(r => [r.edit.id, r]))
    // Quiet mode, bigger labels, colour-blind colours: over NeverSink's rules
    // as you left them.
    const presetChanges = applyPresetChanges(next, cfg().presets)
    // The safety net goes on top, listing only what the rest still hides.
    // Restyles of the net apply after it exists.
    let netCount = 0
    let netList = ''
    let netFresh: NetList | null = null
    if (cfg().safetyNet.on) {
      // woke: no prices (a new league, a fresh install) must not take the net
      // out of the file: the last list stays until there are prices again.
      const lookup = prices.safety.value
      const line = cfg().safetyNet.minChaos
      const types = prices.pricedTypes?.value
      const known = lookup
        ? (types ? withLast(lookup, cfg().safetyNet.last, line, t => types.has(t)) : lookup)
        : lastLookup(cfg().safetyNet.last, line)
      const verdicts = auditBases(next, known, line)
      const bases = netFromAudit(verdicts, v => heldBack(v))
      const stackHeld = (group: EconomyGroup, base: string) => cfg().netDismissed[`${group.type}|${base}`] != null || movedDown(group, base)
      const last = cfg().safetyNet.last
      if (lookup) {
        const stacks = stackNet(next, lookup, line, stackHeld)
        if (Object.keys(stacks).length) bases.stacks = stacks
      } else if (last?.stacks && !(last.line != null && line > last.line)) {
        // Only names this filter lists, as with the rest of the list, and not
        // what you held back since. A line raised since can't rely on them.
        const listed = new Set(next.blocks.flatMap(b => b.conditions.flatMap(c => c.key === 'BaseType' ? c.values : [])))
        const held = (base: string) => NET_GROUPS.some(g => !g.unique && stackHeld(g, base))
        const kept = Object.entries(last.stacks).map(([size, list]) => [size, list.filter(b => listed.has(b) && !held(b))] as const).filter(([, list]) => list.length)
        if (kept.length) bases.stacks = Object.fromEntries(kept)
      }
      const netBlocks = safetyBlocks(bases)
      if (cfg().presets.colourBlind.on) netBlocks.forEach(colourBlindActions)
      // The drop sound volume preset reaches the net's sound too.
      const volume = cfg().presets.volume
      if (volume.on && volume.percent < 100) netBlocks.forEach(b => scaleVolume(b, volume.percent))
      insertBuildBlocks(next, netBlocks)
      if (lookup) netFresh = { ...valuableFromAudit(verdicts), line, ...(bases.stacks ? { stacks: bases.stacks } : {}) }
      netCount = bases.plain.length + bases.unique.length + Object.values(bases.stacks ?? {}).reduce((n, l) => n + l.length, 0)
      if (lookup || netCount) netList = JSON.stringify(bases)
    }
    for (const r of applyEdits(next, cfg().edits.filter(isNetEdit))) results.set(r.edit.id, r)
    return { doc: next, results, buildCount, netCount, netList, netFresh, movesFit, outOfPlace, presetChanges, presetSig: JSON.stringify(presetTop.map(b => b.conditions)) }
  }

  // Own rules and presets as last built, to rebuild when the UI edits them.
  let builtRulesSig = ''
  const rulesSig = () => JSON.stringify([cfg().rules, cfg().presets])

  function rebuild () {
    if (baseText.value == null) { doc.value = null; return }
    builtRulesSig = rulesSig()
    const c = compose(baseText.value)
    buildBlockCount.value = c.buildCount
    safetyCount.value = c.netCount
    safetyList.value = c.netList
    // Only a change: this runs often and the config is watched.
    if (c.netFresh && JSON.stringify(cfg().safetyNet.last) !== JSON.stringify(c.netFresh)) cfg().safetyNet.last = c.netFresh
    presetChanges.value = c.presetChanges
    presetList.value = c.presetSig
    statuses.value = cfg().edits.map(e => c.results.get(e.id)!)
    priceMoved = c.outOfPlace
    doc.value = c.doc
    publishActiveFilter(api)
  }

  // The filter to compare the preview with: NeverSink as it came, or another
  // strictness level with all your changes on it.
  async function compareDoc (against: 'untouched' | number): Promise<FilterDoc | null> {
    if (against === 'untouched') return baseText.value != null ? parseFilter(baseText.value) : null
    const ns = cfg().neversink
    if (!ns.on) return null
    const { text } = await readNeverSink(ns.version, against)
    return compose(text).doc
  }

  // ---- prices ----

  const locked = computed(() => lockedByEdits(cfg().edits, cfg().priceTiers.locks))
  const plan = computed<RetierPlan | null>(() => {
    const d = doc.value
    const lookup = prices.lookup.value
    if (!d || !lookup || !cfg().priceTiers.on || pricesTooOld.value) return null
    return planRetier(d, lookup, { locked: locked.value, moved: priceMoved })
  })
  // Valuable items the filter (without the safety net) hides or shows small.
  const health = computed<BaseVerdict[]>(() => {
    const d = doc.value
    const lookup = prices.safety.value
    if (!d || !lookup) return []
    return auditBases(d, lookup, Math.min(cfg().safetyNet.minChaos, 10)).filter(v => v.state !== 'ok' && !v.mine && !heldBack(v))
  })

  // Applies the planned moves (all, or the ones passed).
  function applyPrices (moves?: PriceMove[]) {
    const list = moves ?? plan.value?.moves ?? []
    if (!list.length) return () => {}
    const before = cfg().priceTiers.moves
    cfg().priceTiers.prev = before
    // Another league's moves don't build on these.
    const league = prices.currentLeague.value ?? undefined
    // Moves from before leagues were kept are this league's from now on.
    cfg().priceTiers.moves = mergeMoves(activeMoves().map(m => m.league ? m : { ...m, league }), list.map(m => ({ ...m, league })))
    cfg().priceTiers.appliedAt = Date.now()
    rebuild()
    return () => {
      cfg().priceTiers.moves = before
      cfg().priceTiers.prev = null
      rebuild()
    }
  }

  // Keeps an item where it is: prices won't move it again.
  function lockItem (type: string, base: string) {
    const key = lockKey(type, base)
    if (!cfg().priceTiers.locks.includes(key)) cfg().priceTiers.locks = [...cfg().priceTiers.locks, key]
    return () => { cfg().priceTiers.locks = cfg().priceTiers.locks.filter(k => k !== key) }
  }

  // Puts one moved item back and keeps it there, so prices don't just move it again.
  function unmovePrice (type: string, base: string) {
    const before = cfg().priceTiers.moves
    const key = lockKey(type, base)
    const hadLock = cfg().priceTiers.locks.includes(key)
    cfg().priceTiers.moves = before.filter(m => !(m.type === type && m.base === base))
    if (!hadLock) cfg().priceTiers.locks = [...cfg().priceTiers.locks, key]
    rebuild()
    return () => {
      cfg().priceTiers.moves = before
      if (!hadLock) cfg().priceTiers.locks = cfg().priceTiers.locks.filter(k => k !== key)
      rebuild()
    }
  }

  // ---- the step-by-step list of changes ----

  const currentSettings = (): Settings => {
    const c = cfg()
    return { edits: c.edits, rules: c.rules, presets: c.presets, moves: c.priceTiers.moves, locks: c.priceTiers.locks }
  }
  // A plain copy: rules and presets are changed in place by their editors.
  const copySettings = (): Settings => JSON.parse(JSON.stringify(currentSettings()))
  // What the settings were at the last recorded step. Changes are gathered for a
  // moment, so dragging a slider is one step and not fifty.
  const TIMELINE_WAIT_MS = 500
  let settled = copySettings()
  let settleTimer: ReturnType<typeof setTimeout> | undefined

  function sourceParsed (): FilterDoc | null {
    if (baseText.value == null) return null
    // With your presets on it: bigger labels aren't a change to reset, tier by tier.
    const presets = JSON.stringify(cfg().presets)
    if (sourceDoc?.text !== baseText.value || sourceDoc.presets !== presets) {
      const doc = parseFilter(baseText.value)
      applyPresetChanges(doc, cfg().presets)
      sourceDoc = { text: baseText.value, presets, doc }
    }
    return sourceDoc.doc
  }

  function sourceLook (type: string, tier: string): StylePatch {
    const doc = sourceParsed()
    if (!doc) return {}
    const blocks = blocksOf(doc, type, tier)
    const b = blocks.find(x => !x.disabled) ?? blocks[0]
    return b ? readStyle(b.actions) : {}
  }

  // The tier's stack size as NeverSink has it: going back to it isn't a change.
  function sourceStack (type: string, tier: string): number | null {
    const doc = sourceParsed()
    if (!doc) return null
    for (const b of blocksOf(doc, type, tier)) {
      const c = b.conditions.find(x => x.key === 'StackSize' && x.op === '>=')
      if (c) return Number(c.values[0])
    }
    return null
  }
  let sourceDoc: { text: string, presets: string, doc: FilterDoc } | null = null

  function settle () {
    clearTimeout(settleTimer)
    settleTimer = undefined
    const now = copySettings()
    cfg().timeline = observe(cfg().timeline, settled, now, describeStep(settled, now, sourceLook))
    settled = now
  }

  // Settings swapped in a whole new config: that's not a change of yours.
  watch(cfg, () => {
    clearTimeout(settleTimer)
    settled = copySettings()
  }, { flush: 'sync' })

  watch(() => JSON.stringify(currentSettings()), () => {
    if (JSON.stringify(settled) === JSON.stringify(currentSettings())) return
    clearTimeout(settleTimer)
    settleTimer = setTimeout(settle, TIMELINE_WAIT_MS)
  })

  // Back or forward to `at` steps in. Keeps the file as it is until you save.
  function goToStep (at: number) {
    settle()
    const t = cfg().timeline
    if (at < 0 || at > t.steps.length || at === t.at) return
    const part = settingsAt(t, at)
    const c = cfg()
    if (part.edits) c.edits = part.edits
    if (part.rules) c.rules = part.rules
    if (part.presets) c.presets = normalizePresets(part.presets)
    if (part.moves) c.priceTiers.moves = part.moves
    if (part.locks) c.priceTiers.locks = part.locks
    c.timeline = { ...t, at }
    settled = copySettings()
    clearUndoToasts()
    rebuild()
  }

  const undoStep = () => { settle(); if (cfg().timeline.at > 0) goToStep(cfg().timeline.at - 1) }
  const redoStep = () => { settle(); if (cfg().timeline.at < cfg().timeline.steps.length) goToStep(cfg().timeline.at + 1) }

  // Back to NeverSink's own tiers for every price group.
  function resetPrices () {
    const before = cfg().priceTiers.moves
    cfg().priceTiers.prev = before
    cfg().priceTiers.moves = []
    rebuild()
    return () => { cfg().priceTiers.moves = before; rebuild() }
  }

  // Price index updates, or settings that change the net: refresh.
  watch(() => [prices.lookup.value, prices.safety.value, cfg().safetyNet.on, cfg().safetyNet.minChaos, cfg().priceTiers.on, cfg().netDismissed, prices.currentLeague.value], () => {
    if (baseText.value != null) rebuild()
  })

  async function listFiles () {
    try {
      const res = await hostRequest<{ dir: string, files: FilterFile[] }>('filter-list', { dir: cfg().folder })
      folder.value = res.dir
      files.value = res.files
    } catch (e) {
      error.value = `Can't read the filter folder: ${(e as Error).message}`
    }
  }

  // ---- NeverSink from GitHub ----

  // Download result for a newer version, checked against your changes before
  // you're asked to update (E1).
  const updateReady = shallowRef<{ version: string, ok: number, total: number, movesFit: number, movesTotal: number } | null>(null)
  const checking = ref(false)
  // What the game has selected (production_Config.ini).
  const gameFilter = shallowRef<{ name: string | null, loaded: boolean | null }>({ name: null, loaded: null })

  async function readNeverSink (version: string | null, level: number): Promise<{ text: string, version: string }> {
    const ns = cfg().neversink
    if (version) {
      try {
        return { text: (await hostRequest<{ text: string }>('ns-read', { version, style: ns.style, level })).text, version }
      } catch {}
    }
    // Not cached (first use, a new style, or a cleared cache): download.
    const got = await hostRequest<{ version: string }>('ns-download', { style: ns.style })
    return { text: (await hostRequest<{ text: string }>('ns-read', { version: got.version, style: ns.style, level })).text, version: got.version }
  }

  // Parses a text with everything applied, the way rebuild() does, to see how
  // many of your changes would fit.
  function fitOf (text: string): { ok: number, total: number, movesFit: number, movesTotal: number } {
    const c = compose(text)
    const res = [...c.results.values()]
    return { ok: res.filter(r => r.ok).length, total: res.length, movesFit: c.movesFit, movesTotal: activeMoves().length }
  }

  // Once a day: is there a newer NeverSink? If so, download it and check it
  // against your changes; the editor then offers the update.
  const isNewer = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' }) > 0

  async function checkForUpdate (force = false) {
    const ns = cfg().neversink
    if (!ns.on || checking.value) return
    const fresh = !force && ns.checkedAt != null && Date.now() - ns.checkedAt < 20 * 3600 * 1000
    if (fresh && !(ns.latest && ns.latest !== ns.version)) return
    checking.value = true
    try {
      // woke: within the day, reuse what GitHub said and the copy already
      // downloaded. Every load (each strictness switch) used to download all
      // seven files again while an update was waiting.
      let latest = ns.latest
      if (!fresh || !latest) {
        const got = await hostRequest<{ version: string, changes: string }>('ns-latest', {})
        latest = got.version
        ns.latest = got.version
        ns.latestChanges = got.changes
        ns.checkedAt = Date.now()
      }
      // Only ever forward: a copy from master can be ahead of the latest release.
      if (!ns.version || !isNewer(latest, ns.version)) { updateReady.value = null; return }
      let version = latest
      let text: string
      try {
        text = (await hostRequest<{ text: string }>('ns-read', { version, style: ns.style, level: ns.level })).text
      } catch {
        version = (await hostRequest<{ version: string }>('ns-download', { style: ns.style })).version
        if (!isNewer(version, ns.version)) { updateReady.value = null; return }
        text = (await hostRequest<{ text: string }>('ns-read', { version, style: ns.style, level: ns.level })).text
      }
      updateReady.value = { version, ...fitOf(text) }
    } catch (e) {
      // Offline or GitHub down: try again next time, quietly (P13).
      console.warn('[loot filter] NeverSink update check failed', e)
    } finally {
      checking.value = false
    }
  }

  async function switchVersion (version: string | null) {
    const ns = cfg().neversink
    ns.version = version
    await load()
    if (doc.value) await save()
  }

  // Moves to the downloaded version. Returns Undo (back to the old version).
  async function updateNeverSink (): Promise<() => void> {
    const ready = updateReady.value
    const ns = cfg().neversink
    if (!ready) return () => {}
    const before = ns.version
    ns.prevVersion = before
    updateReady.value = null
    await switchVersion(ready.version)
    hostRequest('ns-prune', { keep: 3 }).catch(() => {})
    return () => { switchVersion(before).catch(() => {}) }
  }

  async function useGitHub (on: boolean) {
    cfg().neversink.on = on
    await load()
    if (on) checkForUpdate(true).catch(() => {})
  }

  async function setStyle (style: string) {
    const ns = cfg().neversink
    if (ns.style === style) return
    ns.style = style
    // The pinned version may not exist in this style yet; read() downloads.
    await load()
  }

  // Switches strictness and saves. Returns Undo, or null if nothing was saved.
  let levelSwitch = 0
  async function setLevel (level: number, opts: { auto?: boolean } = {}): Promise<(() => void) | null> {
    const ns = cfg().neversink
    if (!ns.on) return null
    const before = ns.level
    const next = clampLevel(level)
    if (next === before) return null
    const mine = ++levelSwitch
    ns.level = next
    await load()
    // A newer switch (a second key press) saves its own level. Going by the switch,
    // not the level: A, B, A has this load's rules out of date with the level right.
    if (mine !== levelSwitch) return null
    if (!doc.value || !await save({ auto: opts.auto })) return null
    return () => { setLevel(before).catch(() => {}) }
  }

  // Hotkey / button: one step, which pauses the ladder until you resume it.
  async function stepLevel (dir: 1 | -1) {
    const ns = cfg().neversink
    if (!ns.on) {
      toast('Strictness keys need NeverSink from GitHub. Turn it on in the loot filter editor.')
      return
    }
    const next = clampLevel(ns.level + dir)
    if (next === ns.level) {
      toast(`Loot filter is already ${LEVEL_NAMES[next]}`)
      return
    }
    const before = ns.level
    const wasPaused = cfg().strictAuto.paused
    if (cfg().strictAuto.on) cfg().strictAuto.paused = true
    const mine = levelSwitch + 1
    const undo = await setLevel(next).catch(() => null)
    // A newer key press took over: that one tells.
    if (mine !== levelSwitch) return
    if (!undo) {
      await levelNotSwitched(before, wasPaused, next)
      return
    }
    toast(`Loot filter: ${LEVEL_NAMES[next]}${cfg().strictAuto.on && !wasPaused ? ' · auto strictness paused' : ''}`, {
      undo: () => { cfg().strictAuto.paused = wasPaused; undo() }
    })
  }

  // A switch that didn't save: back to the level the game file still is, so
  // the next try (a key press, the ladder in the next town) switches again.
  async function levelNotSwitched (before: number, wasPaused: boolean, next: number) {
    const why = error.value
    cfg().neversink.level = before
    cfg().strictAuto.paused = wasPaused
    await load().catch(() => {})
    toast(`Couldn't switch to ${LEVEL_NAMES[next]}.${why ? ` ${why}` : ''}`)
  }

  // The dock card: a level you picked. Picking what the ladder wants isn't taking
  // over from it. The reload waits for your click on the card: this can come from
  // a timer (scrolling), and GGG's rules don't allow a chat command from one.
  async function pickLevel (level: number) {
    const ns = cfg().neversink
    const auto = cfg().strictAuto
    const next = clampLevel(level)
    if (!ns.on) return
    if (next === ns.level) {
      if (auto.on && auto.paused && ladderPick.value === next) auto.paused = false
      return
    }
    const before = ns.level
    const wasPaused = auto.paused
    const hadEdits = userDirty()
    if (auto.on) auto.paused = ladderPick.value !== next
    const mine = levelSwitch + 1
    const undo = await setLevel(next, { auto: true }).catch(() => null)
    if (mine !== levelSwitch) return
    if (!undo) {
      // Neither saved nor loaded: the card goes back to what the game file still is.
      const why = error.value
      ns.level = before
      auto.paused = wasPaused
      await load().catch(() => {})
      toast(`Couldn't switch to ${LEVEL_NAMES[next]}.${why ? ` ${why}` : ''}`)
      return
    }
    if (hadEdits) {
      toast(`Loot filter: ${LEVEL_NAMES[next]}. Your unsaved edits were saved with it.`, { undo: () => { auto.paused = wasPaused; undo() } })
    } else if (!cfg().reloadViaChat) {
      toast(`Loot filter: ${LEVEL_NAMES[next]}. Reload it in the game's options to use it.`)
    }
  }

  function resumeLadder () {
    cfg().strictAuto.paused = false
    followLadder()
  }

  let ladderHeldFor: number | null = null

  // In town or hideout: switch to what the ladder says for recent maps.
  // Returns true when it started a switch. It saves the file; the reload waits
  // for you to press Reload now.
  function followLadder (): boolean {
    const ns = cfg().neversink
    if (!ns.on || !doc.value || saving.value) return false
    const target = ladderTarget(cfg().strictAuto, recentAreas.value)
    if (target == null || target === ns.level) return false
    // woke: a switch saves, and you haven't said these are ready for the game.
    if (userDirty()) {
      if (ladderHeldFor !== target) toast(`Auto strictness wants ${LEVEL_NAMES[target]}, but waits until you save your changes.`)
      ladderHeldFor = target
      return false
    }
    ladderHeldFor = null
    const top = Math.max(...recentAreas.value)
    const before = ns.level
    const wasPaused = cfg().strictAuto.paused
    const mine = levelSwitch + 1
    setLevel(target, { auto: true }).catch(() => null).then(async undo => {
      if (mine !== levelSwitch) return
      if (!undo) {
        await levelNotSwitched(before, wasPaused, target)
        return
      }
      toast(`Loot filter: ${LEVEL_NAMES[target]}, for area level ${top} maps.${cfg().reloadViaChat ? ` ${reloadHint()}` : ''}`, {
        undo: () => { cfg().strictAuto.paused = true; undo() }
      })
    }).catch(() => {})
    return true
  }

  async function readGameFilter () {
    try {
      gameFilter.value = await hostRequest<{ name: string | null, loaded: boolean | null }>('game-filter', {})
    } catch {}
  }
  // The game's config file is only rewritten now and then, so after we've
  // sent /itemfilter it may still name the old filter: don't nag about that.
  const sentOver = ref<string | null>(null)
  // Our copy exists, so /itemfilter has something to load.
  const outputSaved = computed(() => lastSaved.value != null || files.value.some(f => !f.online && f.name === outputName(cfg())))
  // The game's selected filter isn't the one we save to.
  const wrongFilterInGame = computed(() => {
    const name = gameFilter.value.name
    if (!name || !doc.value || !outputSaved.value || name === sentOver.value) return false
    // The game writes a local filter with its extension.
    return stem(outputName(cfg())).toLowerCase() !== stem(name).toLowerCase()
  })

  // woke: loads can overlap (two strictness steps in a row, a quick change
  // of file). Only the newest one may set the text, or the editor could end
  // up on the level or file you just left.
  let loadSeq = 0

  async function load () {
    const seq = ++loadSeq
    if (cfg().neversink.on) {
      loading.value = true
      error.value = null
      prices.wantPrices()
      try {
        const ns = cfg().neversink
        const got = await readNeverSink(ns.version, ns.level)
        if (seq !== loadSeq) return
        ns.version = got.version
        baseNeedsBackup.value = false
        baseText.value = got.text
        rebuild()
        baseVersion.value = doc.value?.version ?? null
        checkForUpdate().catch(() => {})
      } catch (e) {
        if (seq !== loadSeq) return
        error.value = `Can't get NeverSink's filter from GitHub: ${(e as Error).message}`
        baseText.value = null
        doc.value = null
      } finally {
        if (seq === loadSeq) loading.value = false
      }
      readGameFilter().catch(() => {})
      return
    }
    if (!cfg().sourceName) {
      await listFiles()
      if (seq !== loadSeq) return
      // Start from what the game is using, else the most recently changed
      // NeverSink file.
      await readGameFilter()
      if (seq !== loadSeq) return
      const inGame = gameFilter.value.name
      const ns = files.value.find(f => inGame != null && f.name === inGame) ??
        files.value.find(f => !f.online && /neversink/i.test(f.name) && !/\(woke\)/i.test(f.name)) ??
        files.value.find(f => f.online && /neversink/i.test(f.title ?? ''))
      if (!ns) return
      cfg().sourceName = ns.name
      cfg().sourceOnline = Boolean(ns.online)
      cfg().sourceTitle = ns.title ?? ''
    }
    loading.value = true
    error.value = null
    prices.wantPrices()
    try {
      const source = cfg().sourceName
      let { text } = await hostRequest<{ text: string }>('filter-read', { dir: cfg().folder, name: source, online: cfg().sourceOnline })
      if (seq !== loadSeq) return
      baseNeedsBackup.value = false
      if (cfg().sourceOnline) {
        // Read only; saves go to a local copy.
      } else if (text.startsWith(WOKE_MARK)) {
        // Our own output. Overwrite mode keeps the original in the .bak; a
        // copy-mode output names its source in the header instead.
        try {
          text = (await hostRequest<{ text: string }>('filter-read', { dir: cfg().folder, name: source + '.bak' })).text
        } catch (e) {
          const from = /^# Made from "([^"]+\.filter)"/m.exec(text)?.[1]
          if (from && from !== source) {
            text = (await hostRequest<{ text: string }>('filter-read', { dir: cfg().folder, name: from })).text
            if (seq !== loadSeq) return
            cfg().sourceName = from
          } else {
            // A copy of an online filter names it by title, if it's still there.
            const title = /^# Made from "(.+?) \(online filter/m.exec(text)?.[1]
            await listFiles()
            if (seq !== loadSeq) return
            const online = files.value.find(f => f.online && f.title === title)
            if (title && online) {
              text = (await hostRequest<{ text: string }>('filter-read', { dir: cfg().folder, name: online.name, online: true })).text
              if (seq !== loadSeq) return
              cfg().sourceName = online.name
              cfg().sourceOnline = true
              cfg().sourceTitle = title
            } else if (isWokeCopy(source)) {
              // Original gone: recover it from the copy, and keep it for next time.
              text = baseFromCopy(text)
              baseNeedsBackup.value = true
            } else {
              throw new Error(`${source} is a copy this editor made. Pick the filter it was made from.`, { cause: e })
            }
          }
        }
        if (seq !== loadSeq) return
      } else if (cfg().saveMode === 'overwrite') {
        baseNeedsBackup.value = true
      }
      baseText.value = text
      rebuild()
      baseVersion.value = doc.value?.version ?? null
      // woke: the filter you made this from changed (FilterBlade, an online
      // filter the game updated): bring the copy along unless you're mid-change.
      const savedHash = cfg().savedSourceHash
      // Only about the same source: opening another filter isn't a change to it.
      sourceChanged.value = savedHash != null && savedHash.startsWith(`${cfg().sourceName}|`) && savedHash !== sourceStamp(text)
      if (sourceChanged.value && outputSaved.value && mayAutoSave()) save({ noReload: true }).catch(() => {})
    } catch (e) {
      if (seq !== loadSeq) return
      error.value = `Can't open ${cfg().sourceName}: ${(e as Error).message}`
      baseText.value = null
      doc.value = null
    } finally {
      if (seq === loadSeq) loading.value = false
    }
  }

  // How many tiers of its group list each base in the filter as it came, to
  // tell moves apart from a chain of one move.
  let listings: { text: string, tiers: Map<string, Set<string>> } | null = null
  function separateMoves (e: NewFilterEdit | FilterEdit): boolean {
    if (e.kind !== 'move' || baseText.value == null) return false
    if (listings?.text !== baseText.value) {
      const tiers = new Map<string, Set<string>>()
      for (const b of parseFilter(baseText.value).blocks) {
        for (const c of b.conditions) {
          if (c.key !== 'BaseType' || c.op !== '==' || !b.type || !b.tier) continue
          for (const v of c.values) {
            const key = `${b.type}|${v}`
            if (!tiers.has(key)) tiers.set(key, new Set())
            tiers.get(key)!.add(b.tier)
          }
        }
      }
      listings = { text: baseText.value, tiers }
    }
    return (listings.tiers.get(`${e.type}|${e.base}`)?.size ?? 0) > 1
  }

  function edit (e: NewFilterEdit | FilterEdit) {
    cfg().edits = addEdit(cfg().edits, { ...e, id: nextEditId() } as FilterEdit, { separateMoves: separateMoves(e) })
    rebuild()
  }

  // Adds an edit and returns a function that takes it back out (for Undo).
  function editWithUndo (e: NewFilterEdit | FilterEdit): () => void {
    const before = cfg().edits
    edit(e)
    return () => { cfg().edits = before; rebuild() }
  }

  // Several edits as one step (a drag of several bases), one Undo.
  function editsWithUndo (list: Array<NewFilterEdit | FilterEdit>): () => void {
    const before = cfg().edits
    let edits = before
    for (const e of list) edits = addEdit(edits, { ...e, id: nextEditId() } as FilterEdit, { separateMoves: separateMoves(e) })
    cfg().edits = edits
    rebuild()
    return () => { cfg().edits = before; rebuild() }
  }

  // Any change to the config (own rules, presets, an imported code) as one
  // step with Undo: `change` mutates, the snapshot puts it back.
  function changeWithUndo (change: (c: LootFilterWidget) => void): () => void {
    const c = cfg()
    const before = JSON.stringify({ edits: c.edits, rules: c.rules, presets: c.presets, locks: c.priceTiers.locks })
    change(c)
    rebuild()
    return () => {
      const b = JSON.parse(before)
      const now = cfg()
      now.edits = b.edits
      now.rules = b.rules
      now.presets = b.presets
      now.priceTiers.locks = b.locks
      rebuild()
    }
  }

  // Points a failed edit at a new group/tier (after a NeverSink update).
  function replaceEdit (next: FilterEdit) {
    cfg().edits = cfg().edits.map(e => e.id === next.id ? next : e)
    rebuild()
  }

  // Returns a function that puts the edit back (for the Undo toast).
  function removeEdit (id: number) {
    const before = cfg().edits
    cfg().edits = before.filter(e => e.id !== id)
    rebuild()
    return () => { cfg().edits = before; rebuild() }
  }

  function header (): string[] {
    const d = doc.value!
    return [
      WOKE_MARK,
      cfg().neversink.on
        ? `# Made from NeverSink ${d.version ?? ''} ${LEVEL_NAMES[cfg().neversink.level]}${cfg().neversink.style ? ` (${cfg().neversink.style.toLowerCase()} style)` : ''}, downloaded from GitHub, with ${countOf(cfg().edits.length, 'change')}.`
        : `# Made from "${cfg().sourceOnline ? `${cfg().sourceTitle} (online filter, this copy doesn't auto-update)` : cfg().sourceName}"${d.version ? ` (NeverSink ${d.version})` : ''} with ${countOf(cfg().edits.length, 'change')}${buildBlockCount.value ? ` and ${countOf(buildBlockCount.value, 'build rule')} for ${buildInput.value?.buildName ?? 'your build'}` : ''}.`,
      '# This file is rewritten on every save from the loot filter editor; change it there.',
      ''
    ]
  }

  function pushHistory (edits: FilterEdit[], moves: PriceMove[]) {
    const last = cfg().history[0]
    if (last && JSON.stringify([last.edits, last.moves]) === JSON.stringify([edits, moves])) return
    const label = `${countOf(edits.length, 'change')}${moves.length ? `, ${countOf(moves.length, 'price move')}` : ''}`
    cfg().history = [{ ts: Date.now(), label, edits, moves }, ...cfg().history].slice(0, HISTORY_SIZE)
  }

  // Puts the changes back as they were at an earlier save.
  function restore (ts: number) {
    const point = cfg().history.find(h => h.ts === ts)
    if (!point) return () => {}
    const before = { edits: cfg().edits, moves: cfg().priceTiers.moves }
    cfg().edits = point.edits
    cfg().priceTiers.moves = point.moves
    rebuild()
    return () => { cfg().edits = before.edits; cfg().priceTiers.moves = before.moves; rebuild() }
  }

  // reloadNow: you pressed Save + reload, so it reloads wherever you are. Saves
  // you didn't ask to reload (quick fixes) follow reloadWhenSafe. auto: nobody
  // pressed anything (the ladder), so it never sends; see the log handler above.
  // Saves run one at a time: two quick fixes in a row must not race for the
  // same temp file, and the last one writes the latest edits.
  let saveQueue: Promise<unknown> = Promise.resolve()
  function save (opts: { reloadNow?: boolean, noReload?: boolean, auto?: boolean } = {}): Promise<boolean> {
    const run = saveQueue.then(() => saveNow(opts))
    saveQueue = run.catch(() => {})
    return run
  }

  async function saveNow (opts: { reloadNow?: boolean, noReload?: boolean, auto?: boolean }): Promise<boolean> {
    if (!doc.value || baseText.value == null) return false
    // Queued behind other saves: look again now it's this one's turn.
    if (opts.noReload && ((!dirty.value && !sourceChanged.value) || !mayAutoSave())) return false
    problems.value = validateFilter(doc.value)
    if (problems.value.length) {
      error.value = `Not saved, the game would reject it: ${describeProblem(problems.value[0])}${problems.value.length > 1 ? ` (and ${problems.value.length - 1} more)` : ''}`
      return false
    }
    saving.value = true
    error.value = null
    try {
      const name = outputName(cfg())
      if (!cfg().sourceOnline && (cfg().saveMode === 'overwrite' || isWokeCopy(cfg().sourceName)) && baseNeedsBackup.value) {
        await hostRequest('filter-write', { dir: cfg().folder, name: cfg().sourceName + '.bak', text: baseText.value })
        baseNeedsBackup.value = false
      }
      // Pack sounds the filter uses go into the folder first, so the game finds them.
      await installPackSounds(customSoundsIn(doc.value), cfg().folder).catch(() => {
        toast('Couldn\'t copy NeverSink\'s sounds into your filter folder, so those rules will be silent.')
      })
      // What this write holds, taken now: an edit made while it runs is not in
      // the file and must still read as unsaved.
      const written = {
        sig: signature(),
        build: hash(buildSig.value),
        extra: extraSig(),
        user: userSig(),
        source: sourceStamp(baseText.value),
        edits: cfg().edits,
        moves: cfg().priceTiers.moves,
        version: doc.value.version
      }
      await hostRequest('filter-write', { dir: cfg().folder, name, text: serializeFilter(doc.value, header()) })
      savedEdits.value = written.sig
      cfg().savedBuildSig = written.build
      cfg().savedExtraSig = written.extra
      cfg().savedUserSig = written.user
      pushHistory(written.edits, written.moves)
      cfg().lastVersion = written.version
      lastSaved.value = Date.now()
      if (opts.noReload) netWaitsForReload.value = true
      else {
        netWaitsForReload.value = false
        if (cfg().reloadViaChat) {
          if (opts.auto) holdReload()
          else reloadInGame(opts.reloadNow === true)
        }
      }
      for (const wait of [8000, 60000]) setTimeout(() => { readGameFilter().catch(() => {}) }, wait)
      cfg().savedSourceHash = written.source
      // A newer source may have loaded during the write.
      sourceChanged.value = written.source !== sourceStamp(baseText.value)
      return true
    } catch (e) {
      error.value = `Couldn't save: ${(e as Error).message}`
      return false
    } finally {
      saving.value = false
    }
  }

  // One chat command, sent because you pressed something. Unless forced,
  // reloadWhenSafe holds it outside town/hideout until you press Reload now.
  function reloadInGame (force = false) {
    if (!force && cfg().reloadWhenSafe && inSafeZone.value !== true) {
      holdReload()
      return
    }
    pendingReload.value = false
    sendReload()
  }

  const reloadCommand = () => `/itemfilter ${stem(outputName(cfg()))}`

  function sendReload () {
    netWaitsForReload.value = false
    sentOver.value = gameFilter.value.name
    MainProcess.sendEvent({
      name: 'CLIENT->MAIN::user-action',
      // Right away: extra presses can't pile up and fire later, mid-fight.
      payload: { action: 'paste-in-chat', text: reloadCommand(), immediate: true }
    })
  }

  // The game didn't have focus, so the command never went out: still waiting.
  const chatDropped = MainProcess.onEvent('MAIN->CLIENT::woke-event', ({ topic, data }) => {
    if (topic !== 'chat-dropped' || (data as { text?: string }).text !== reloadCommand()) return
    sentOver.value = null
    holdReload()
  })
  onUnmounted(() => { chatDropped.abort() })

  // woke: the net's list lives in the file, so a new list has to reach the file
  // or the game keeps judging by old prices. Only when nothing of yours is
  // unsaved; the reload still waits for town.
  watch(() => [safetyList.value, activeMoves().length, prices.currentLeague.value], () => {
    if (!cfg().safetyNet.on || !prices.safety.value || baseText.value == null) return
    if (!outputSaved.value || !dirty.value || !mayAutoSave()) return
    // Nobody pressed anything, so nothing gets typed into chat for this.
    save({ noReload: true }).catch(() => {})
  }, { flush: 'post' })

  watch(rulesSig, (sig) => { if (baseText.value != null && sig !== builtRulesSig) rebuild() })

  // A new active build, or a rule switched on or off: show it right away.
  watch(buildSig, () => { if (baseText.value != null) rebuild() })

  const api = {
    get config () { return cfg() },
    prices,
    plan,
    health,
    safetyCount,
    netWithoutPrices,
    netWaitsForReload,
    sourceChanged,
    pricesStale,
    pricesTooOld,
    priceAgeHours,
    movesFromOtherLeague,
    otherMovesLeague,
    problems,
    applyPrices,
    lockItem,
    unmovePrice,
    goToStep,
    undoStep,
    redoStep,
    sourceLook,
    sourceStack,
    resetPrices,
    editWithUndo,
    editsWithUndo,
    changeWithUndo,
    presetChanges,
    compareDoc,
    restore,
    updateReady,
    checking,
    gameFilter,
    wrongFilterInGame,
    checkForUpdate,
    updateNeverSink,
    useGitHub,
    setStyle,
    setLevel,
    stepLevel,
    pickLevel,
    ladderPick,
    resumeLadder,
    buildInput,
    buildBlockCount,
    files,
    folder,
    doc,
    statuses,
    failed,
    loading,
    saving,
    error,
    dirty,
    lastSaved,
    baseVersion,
    updatedSinceSave,
    areaLevel,
    inSafeZone,
    pendingReload,
    outputSaved,
    listFiles,
    load,
    edit,
    removeEdit,
    replaceEdit,
    save,
    reloadInGame
  }
  return api
}

export type LootFilterStore = ReturnType<typeof useLootFilter>
