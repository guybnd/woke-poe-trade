// Loads the source filter, applies the widget's edits, and saves the result.
import { computed, onUnmounted, shallowRef, ref, watch } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { hostRequest } from '../shared/host'
import { customSoundsIn, installPackSounds } from './sounds'
import { ruleBlocks } from './rules'
import { applyPresetChanges, presetBlocks, presetsOn } from './presets'
import { isTownLike } from '../campaign/log-parse'
import { onGameLog } from '../shared/game-log'
import { parseFilter, serializeFilter } from './parse'
import type { FilterDoc } from './parse'
import { addEdit, applyEdits, nextEditId } from './edits'
import type { EditStatus, FilterEdit, NewFilterEdit } from './edits'
import { HISTORY_SIZE, baseFromCopy, isWokeCopy, outputName } from './widget'
import type { LootFilterWidget } from './widget'
import { buildRuleBlocks, insertBuildBlocks } from './build-rules'
import { useBuildRuleInput } from './build-input'
import { applyPriceMoves, lockKey, lockedByEdits, mergeMoves, planRetier } from './economy'
import type { PriceMove, RetierPlan } from './economy'
import { SAFETY_RULE_TYPE, auditBases, safetyBases, safetyBlocks } from './safety'
import type { BaseVerdict } from './safety'
import { describeProblem, validateFilter } from './validate'
import type { FilterProblem } from './validate'
import { useFilterPrices } from './prices'
import { publishActiveFilter } from './active-filter'
import { LEVEL_NAMES, clampLevel, ladderTarget, ladderZone, pushArea } from './strictness'
import { toast } from '../ui'

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
  // woke: with NeverSink from GitHub, the version, style and level are part
  // of the file as well (a new style used to read "saved" until you saved).
  const sourceSig = () => {
    const ns = cfg().neversink
    return ns.on ? [ns.version, ns.style, ns.level] : []
  }
  const extraSig = () => {
    const parts: unknown[] = [cfg().priceTiers.on ? cfg().priceTiers.moves : [], cfg().safetyNet.on ? safetyList.value : '']
    // Only when used, so turning these features on doesn't flag old saves.
    if (cfg().rules.length) parts.push(cfg().rules)
    if (presetsOn(cfg().presets)) parts.push(cfg().presets, presetList.value)
    const src = sourceSig()
    if (src.length) parts.push(src)
    return hash(JSON.stringify(parts))
  }
  const signature = () => JSON.stringify([cfg().edits, hash(buildSig.value), extraSig()])
  // The build part is only known once the build file is read, so start from
  // what the last save used.
  const savedEdits = ref(JSON.stringify([cfg().edits, cfg().savedBuildSig ?? hash(buildSig.value), cfg().savedExtraSig ?? extraSig()]))
  const prices = useFilterPrices(() => cfg().priceTiers.uniqueRule)
  // Problems found by the last save attempt.
  const problems = shallowRef<FilterProblem[]>([])
  const safetyCount = ref(0)
  const lastSaved = ref<number | null>(null)
  // Version of the base file when it was loaded, to flag NeverSink updates.
  const baseVersion = ref<string | null>(null)

  // AreaLevel conditions use the level of the last map/zone entered.
  const areaLevel = ref<number | null>(null)
  // Town or hideout (null until Client.txt shows an area change).
  const inSafeZone = ref<boolean | null>(null)
  // A reload held until the next town/hideout visit.
  const pendingReload = ref(false)
  // The area line is written while the loading screen is still up, when the
  // game drops the keys we'd type; wait until the zone has loaded.
  const RELOAD_AFTER_LOAD_MS = 4000
  let reloadTimer: ReturnType<typeof setTimeout> | undefined
  // Area levels of the last few maps (or campaign zones), for the strictness ladder.
  let recentAreas: number[] = []
  const stopLog = onGameLog((lines) => {
    for (const { ev } of lines) {
      if (ev?.kind !== 'area') continue
      const safe = /town/i.test(ev.areaId) || isTownLike(ev.areaId)
      inSafeZone.value = safe
      if (!safe) {
        areaLevel.value = ev.areaLevel
        if (ladderZone(ev.areaId)) recentAreas = pushArea(recentAreas, ev.areaLevel)
      }
      clearTimeout(reloadTimer)
      if (safe) {
        reloadTimer = setTimeout(() => {
          if (inSafeZone.value !== true) return
          // The ladder switches only here, in town or hideout, never mid-map.
          if (followLadder()) return
          if (!pendingReload.value) return
          pendingReload.value = false
          sendReload()
        }, RELOAD_AFTER_LOAD_MS)
      }
    }
  })
  onUnmounted(() => {
    stopLog()
    clearTimeout(reloadTimer)
  })

  const dirty = computed(() => signature() !== savedEdits.value)
  const failed = computed(() => statuses.value.filter(s => !s.ok))
  const updatedSinceSave = computed(() =>
    baseVersion.value != null && cfg().lastVersion != null && baseVersion.value !== cfg().lastVersion)

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
    const presetTop = presetBlocks(next, cfg().presets, prices.lookup.value)
    insertBuildBlocks(next, presetTop)
    insertBuildBlocks(next, ruleBlocks(cfg().rules))
    // Price moves next: your own moves (edits) are applied after them and win.
    if (cfg().priceTiers.on && cfg().priceTiers.moves.length) applyPriceMoves(next, cfg().priceTiers.moves)
    const isNetEdit = (e: FilterEdit) => e.type === SAFETY_RULE_TYPE
    const results = new Map(applyEdits(next, cfg().edits.filter(e => !isNetEdit(e))).map(r => [r.edit.id, r]))
    // Quiet mode, bigger labels, colour-blind colours: over NeverSink's rules
    // as you left them.
    const presetChanges = applyPresetChanges(next, cfg().presets)
    // The safety net goes on top, listing only what the rest still hides.
    // Restyles of the net apply after it exists.
    let netCount = 0
    let netList = ''
    const lookup = prices.lookup.value
    if (cfg().safetyNet.on && lookup) {
      const bases = safetyBases(next, lookup, cfg().safetyNet.minChaos)
      insertBuildBlocks(next, safetyBlocks(bases))
      netCount = bases.plain.length + bases.unique.length
      netList = JSON.stringify(bases)
    }
    for (const r of applyEdits(next, cfg().edits.filter(isNetEdit))) results.set(r.edit.id, r)
    return { doc: next, results, buildCount, netCount, netList, presetChanges, presetSig: JSON.stringify(presetTop.map(b => b.conditions)) }
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
    presetChanges.value = c.presetChanges
    presetList.value = c.presetSig
    statuses.value = cfg().edits.map(e => c.results.get(e.id)!)
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
    if (!d || !lookup || !cfg().priceTiers.on) return null
    return planRetier(d, lookup, { locked: locked.value })
  })
  // Valuable items the filter (without the safety net) hides or shows small.
  const health = computed<BaseVerdict[]>(() => {
    const d = doc.value
    const lookup = prices.lookup.value
    if (!d || !lookup) return []
    return auditBases(d, lookup, Math.min(cfg().safetyNet.minChaos, 10)).filter(v => v.state !== 'ok' && !v.thin)
  })

  // Applies the planned moves (all, or the ones passed).
  function applyPrices (moves?: PriceMove[]) {
    const list = moves ?? plan.value?.moves ?? []
    if (!list.length) return () => {}
    const before = cfg().priceTiers.moves
    cfg().priceTiers.prev = before
    cfg().priceTiers.moves = mergeMoves(before, list)
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

  // Back to NeverSink's own tiers for every price group.
  function resetPrices () {
    const before = cfg().priceTiers.moves
    cfg().priceTiers.prev = before
    cfg().priceTiers.moves = []
    rebuild()
    return () => { cfg().priceTiers.moves = before; rebuild() }
  }

  // Price index updates, or settings that change the net: refresh.
  watch(() => [prices.lookup.value, cfg().safetyNet.on, cfg().safetyNet.minChaos, cfg().priceTiers.on], () => {
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
  const updateReady = shallowRef<{ version: string, ok: number, total: number } | null>(null)
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
  function fitOf (text: string): { ok: number, total: number } {
    const d = parseFilter(text)
    const input = buildInput.value
    if (input) insertBuildBlocks(d, buildRuleBlocks(input, cfg().buildRules))
    if (cfg().priceTiers.on) applyPriceMoves(d, cfg().priceTiers.moves)
    const res = applyEdits(d, cfg().edits)
    return { ok: res.filter(r => r.ok).length, total: res.length }
  }

  // Once a day: is there a newer NeverSink? If so, download it and check it
  // against your changes; the editor then offers the update.
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
      if (!ns.version || latest === ns.version) { updateReady.value = null; return }
      let version = latest
      let text: string
      try {
        text = (await hostRequest<{ text: string }>('ns-read', { version, style: ns.style, level: ns.level })).text
      } catch {
        version = (await hostRequest<{ version: string }>('ns-download', { style: ns.style })).version
        if (version === ns.version) { updateReady.value = null; return }
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

  // Switches strictness, saves, and reloads in game (when safe). Returns Undo.
  async function setLevel (level: number): Promise<(() => void) | null> {
    const ns = cfg().neversink
    if (!ns.on) return null
    const before = ns.level
    const next = clampLevel(level)
    if (next === before) return null
    ns.level = next
    await load()
    // A newer switch (a second key press) saves its own level.
    if (cfg().neversink.level !== next) return null
    if (doc.value) await save()
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
    const wasPaused = cfg().strictAuto.paused
    if (cfg().strictAuto.on) cfg().strictAuto.paused = true
    const undo = await setLevel(next)
    toast(`Loot filter: ${LEVEL_NAMES[next]}${cfg().strictAuto.on && !wasPaused ? ' · auto strictness paused' : ''}`, {
      undo: undo ? () => { cfg().strictAuto.paused = wasPaused; undo() } : undefined
    })
  }

  function resumeLadder () {
    cfg().strictAuto.paused = false
    followLadder()
  }

  // In town or hideout: switch to what the ladder says for recent maps.
  // Returns true when it started a switch (which reloads on its own).
  function followLadder (): boolean {
    const ns = cfg().neversink
    if (!ns.on || !doc.value || saving.value) return false
    const target = ladderTarget(cfg().strictAuto, recentAreas)
    if (target == null || target === ns.level) return false
    const top = Math.max(...recentAreas)
    pendingReload.value = false
    setLevel(target).then(undo => {
      if (!undo) return
      toast(`Loot filter: ${LEVEL_NAMES[target]}, for area level ${top} maps`, {
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
          } else if (isWokeCopy(source)) {
            // Original gone: recover it from the copy, and keep it for next time.
            text = baseFromCopy(text)
            baseNeedsBackup.value = true
          } else {
            throw e
          }
        }
        if (seq !== loadSeq) return
      } else if (cfg().saveMode === 'overwrite') {
        baseNeedsBackup.value = true
      }
      baseText.value = text
      rebuild()
      baseVersion.value = doc.value?.version ?? null
    } catch (e) {
      if (seq !== loadSeq) return
      error.value = `Can't open ${cfg().sourceName}: ${(e as Error).message}`
      baseText.value = null
      doc.value = null
    } finally {
      if (seq === loadSeq) loading.value = false
    }
  }

  function edit (e: NewFilterEdit | FilterEdit) {
    cfg().edits = addEdit(cfg().edits, { ...e, id: nextEditId() } as FilterEdit)
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
    for (const e of list) edits = addEdit(edits, { ...e, id: nextEditId() } as FilterEdit)
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
        ? `# Made from NeverSink ${d.version ?? ''} ${LEVEL_NAMES[cfg().neversink.level]}${cfg().neversink.style ? ` (${cfg().neversink.style.toLowerCase()} style)` : ''}, downloaded from GitHub, with ${cfg().edits.length} change(s).`
        : `# Made from "${cfg().sourceOnline ? `${cfg().sourceTitle} (online filter, this copy doesn't auto-update)` : cfg().sourceName}"${d.version ? ` (NeverSink ${d.version})` : ''} with ${cfg().edits.length} change(s)${buildBlockCount.value ? ` and ${buildBlockCount.value} build rule(s) for ${buildInput.value?.buildName ?? 'your build'}` : ''}.`,
      '# This file is rewritten on every save from the loot filter editor; change it there.',
      ''
    ]
  }

  function pushHistory () {
    const last = cfg().history[0]
    const moves = cfg().priceTiers.moves
    if (last && JSON.stringify([last.edits, last.moves]) === JSON.stringify([cfg().edits, moves])) return
    const label = `${cfg().edits.length} change(s)${moves.length ? `, ${moves.length} price move(s)` : ''}`
    cfg().history = [{ ts: Date.now(), label, edits: cfg().edits, moves }, ...cfg().history].slice(0, HISTORY_SIZE)
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
  // you didn't ask to reload (quick fixes) follow reloadWhenSafe.
  async function save (opts: { reloadNow?: boolean } = {}): Promise<boolean> {
    if (!doc.value || baseText.value == null) return false
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
      await installPackSounds(customSoundsIn(doc.value), cfg().folder).catch(() => 0)
      await hostRequest('filter-write', { dir: cfg().folder, name, text: serializeFilter(doc.value, header()) })
      savedEdits.value = signature()
      cfg().savedBuildSig = hash(buildSig.value)
      cfg().savedExtraSig = extraSig()
      pushHistory()
      cfg().lastVersion = doc.value.version
      lastSaved.value = Date.now()
      if (cfg().reloadViaChat) reloadInGame(opts.reloadNow === true)
      setTimeout(() => { readGameFilter().catch(() => {}) }, 8000)
      return true
    } catch (e) {
      error.value = `Couldn't save: ${(e as Error).message}`
      return false
    } finally {
      saving.value = false
    }
  }

  // One chat command, sent because you saved. Unless forced, reloadWhenSafe
  // holds it until town/hideout.
  function reloadInGame (force = false) {
    if (!force && cfg().reloadWhenSafe && inSafeZone.value !== true) {
      pendingReload.value = true
      return
    }
    pendingReload.value = false
    sendReload()
  }

  function sendReload () {
    sentOver.value = gameFilter.value.name
    MainProcess.sendEvent({
      name: 'CLIENT->MAIN::user-action',
      payload: { action: 'paste-in-chat', text: `/itemfilter ${stem(outputName(cfg()))}` }
    })
  }

  watch(rulesSig, (sig) => { if (baseText.value != null && sig !== builtRulesSig) rebuild() })

  // A new active build, or a rule switched on or off: show it right away.
  watch(buildSig, () => { if (baseText.value != null) rebuild() })

  const api = {
    get config () { return cfg() },
    prices,
    plan,
    health,
    safetyCount,
    problems,
    applyPrices,
    lockItem,
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
