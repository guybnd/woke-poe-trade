// What Claude can ask the app for. Read tools return the app's own records,
// trimmed to what helps; suggest tools only add a row to the Suggestions card,
// which does nothing until Guy presses Apply. trade_search goes through the
// overlay's own trade rate limiter. Nothing here whispers or buys.
// Pure: everything outside comes through LinkDeps.
import type { ClaudeSuggestion, SuggestionKind } from '../../../../ipc/claude-link'
import { listSettings, settingAllowed } from '../../../../ipc/claude-link'
import { outcome } from './suggestions'
import type { ToolDef } from './rpc'

export interface TreeNodeInfo { kind: string, name: string, stats: string[], asc?: string }

export interface LinkDeps {
  appVersion: string
  // The overlay's config.json, parsed; null when it can't be read.
  config: () => Promise<AppConfigLike | null>
  // A woke-request op, as the overlay would call it.
  op: (name: string, args: unknown) => Promise<unknown>
  lastItem: () => { text: string, at: number } | null
  // Passive tree nodes by id, read from the app's tree data on demand.
  passiveTree: () => Promise<{ nodes: Map<number, TreeNodeInfo>, masteryEffects: Record<string, string[]> } | null>
  // Asks the overlay page for something only it has (atlas tree names).
  askOverlay: (kind: string, args: unknown, timeoutMs?: number) => Promise<unknown>
  stashCache: (league: string) => Promise<StashCacheLike | null>
  // One item's daily prices from the newest `days` daily files, read without
  // the market store's whole-league cache.
  dailyHistory: (league: string, item: { type: string, name: string, variant: string }, days: number) => Promise<Array<{ date: string, chaos: number }>>
  // The live character the character sync last read (woke-character/current.json); null when none.
  character: () => Promise<CharacterLike | null>
  suggestions: {
    list: () => Promise<ClaudeSuggestion[]>
    add: (kind: SuggestionKind, args: Record<string, unknown>, checkSetting: (key: string, value: unknown) => string | null) => Promise<ClaudeSuggestion>
  }
}

export interface CharacterLike {
  version: number
  account?: string
  readAt?: number
  character?: { name?: string, league?: string, class?: string, level?: number }
  gear?: Array<{ slot: string, item: PobItemLike }>
  gems?: Array<{ slot: string, gems: Array<{ name: string, level?: number, quality?: number, support?: boolean }> }>
  tree?: { nodes?: number[], clusterNodes?: number[], masteries?: Record<string, number>, jewels?: Array<{ x: number, item: PobItemLike }> }
}

export interface AppConfigLike { leagueId?: string, widgets?: Array<Record<string, unknown>>, [k: string]: unknown }
interface StashItemLike { name: string, typeLine: string, baseType: string, frame: number, stack: number, ilvl?: number, gemLevel?: number, quality?: number, mapTier?: number, links?: number, corrupted?: boolean, unidentified?: boolean }
export interface StashCacheLike { league: string, account: string, listedAt: number, tabs: Array<{ id: string, name: string, type: string, readAt: number | null, items: StashItemLike[] }> }

const iso = (ms: number | null | undefined) => typeof ms === 'number' && ms > 0 ? new Date(ms).toISOString() : null
const str = (v: unknown) => typeof v === 'string' ? v : ''
const num = (v: unknown, dflt: number, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : dflt
const has = (hay: string, needle: string) => hay.toLowerCase().includes(needle.toLowerCase())
const round = (n: unknown) => typeof n === 'number' ? Math.round(n * 100) / 100 : null

function widgetsOf (cfg: AppConfigLike | null, type: string): Array<Record<string, unknown>> {
  return (cfg?.widgets ?? []).filter(w => w && w.wmType === type)
}

async function leagueOf (deps: LinkDeps, given: unknown): Promise<string> {
  const g = str(given).trim()
  if (g) return g
  const league = (await deps.config())?.leagueId
  if (!league) throw new Error('No league is picked in the app\'s settings. Pass league.')
  return league
}

const FRAMES = ['normal', 'magic', 'rare', 'unique', 'gem', 'currency', 'card', 'quest', 'prophecy', 'relic']

export const INSTRUCTIONS = [
  'Woke PoE Trade is a Path of Exile 1 overlay. These tools read its records on this PC: the last item copied in game, price checks, poe.ninja prices it saved, the stash it read, net worth, saved trade searches, the character played now, Path of Building builds (skills, items, passive trees) and atlas strategies.',
  'Prices are in chaos orbs unless a field says divine.',
  'You cannot whisper or buy. trade_search shows what is listed (prices only, rate limited, use it sparingly); suggest_trade_search hands the player a search to open.',
  'suggest_* tools only add a row to the app\'s Suggestions card. Nothing changes until the player presses Apply. Keep titles short and say why in one line.',
  'Read settings before suggest_setting: only the keys it lists can be suggested, with a value of the same type.'
].join(' ')

export function buildTools (deps: LinkDeps): ToolDef[] {
  const checkSetting = async () => {
    const all = listSettings((await deps.config()) ?? {})
    return (key: string, value: unknown): string | null => {
      if (!(key in all)) return `Unknown or locked setting: ${key}. Call settings for the list.`
      if (!settingAllowed(key, all[key], value)) return `${key} takes a ${typeof all[key]} (now ${JSON.stringify(all[key])}).`
      return null
    }
  }

  const tools: ToolDef[] = [
    {
      name: 'status',
      description: 'The app version, the league picked in its settings, when an item was last copied, and how many suggestions wait.',
      inputSchema: { type: 'object', properties: {} },
      readOnly: true,
      run: async () => {
        const cfg = await deps.config()
        const last = deps.lastItem()
        const open = (await deps.suggestions.list()).filter(s => s.status === 'new').length
        return { app: 'Woke PoE Trade', version: deps.appVersion, league: cfg?.leagueId ?? null, lastItemAt: iso(last?.at), openSuggestions: open }
      }
    },
    {
      name: 'last_item',
      description: 'The last item copied in game (price check or item hotkey), as the game\'s item text, plus the newest recorded price check.',
      inputSchema: { type: 'object', properties: {} },
      readOnly: true,
      run: async () => {
        const last = deps.lastItem()
        const checks = await priceLog(deps)
        const check = checks.length ? checks[checks.length - 1] : null
        return {
          item: last ? { copiedAt: iso(last.at), text: last.text } : null,
          lastPriceCheck: check ? shortCheck(check) : null,
          note: last ? undefined : 'No item copied since the app started.'
        }
      }
    },
    {
      name: 'price_checks',
      description: 'Price checks recorded on this PC, newest first: the search label, fair, low and high price in chaos, and how many listings backed it.',
      inputSchema: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Only checks whose label contains this' },
          limit: { type: 'number', description: 'Most to return, default 20, max 200' }
        }
      },
      readOnly: true,
      run: async (a) => {
        const search = str(a.search)
        const list = (await priceLog(deps)).filter(e => !search || has(e.label, search)).reverse().slice(0, num(a.limit, 20, 1, 200))
        return { count: list.length, checks: list.map(shortCheck) }
      }
    },
    {
      name: 'prices',
      description: 'poe.ninja prices the app saved: the latest price of items whose name matches, the divine rate, and daily history of the best match.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Item name or part of it, e.g. "Mageblood" or "Divine Orb"' },
          type: { type: 'string', description: 'poe.ninja type to narrow it, e.g. Currency, UniqueArmour, DivinationCard, SkillGem' },
          days: { type: 'number', description: 'Days of history for the best match, default 7, max 60' },
          league: { type: 'string', description: 'Default: the app\'s league' }
        },
        required: ['name']
      },
      readOnly: true,
      run: async (a) => {
        const league = await leagueOf(deps, a.league)
        const name = str(a.name).trim()
        if (!name) throw new Error('name is required')
        const type = str(a.type)
        const snaps = await deps.op('market-latest', { league, count: 1 }) as Array<{ ts: number, divine: number | null, items: Array<{ type: string, name: string, variant: string, chaos: number }> }>
        const snap = snaps?.[snaps.length - 1]
        if (!snap) return { league, matches: [], note: 'No prices saved for this league yet. They save while the app runs.' }
        const lower = name.toLowerCase()
        const seen = new Set<string>()
        const rows = snap.items
          .filter(i => (!type || i.type === type) && has(i.name, name))
          .filter(i => { const k = `${i.type}|${i.name}|${i.variant}`; if (seen.has(k)) return false; seen.add(k); return true })
          .sort((x, y) => Number(y.name.toLowerCase() === lower) - Number(x.name.toLowerCase() === lower) || y.chaos - x.chaos)
          .slice(0, 15)
        let history: unknown = null
        const best = rows[0]
        if (best) {
          const daily = await deps.dailyHistory(league, best, num(a.days, 7, 1, 60))
          history = daily.map(d => ({ date: d.date, chaos: round(d.chaos) }))
        }
        return {
          league,
          savedAt: iso(snap.ts),
          divineInChaos: round(snap.divine),
          matches: rows.map(r => ({ type: r.type, name: r.name, variant: r.variant || undefined, chaos: round(r.chaos), divine: snap.divine ? round(r.chaos / snap.divine) : null })),
          historyOfFirst: history
        }
      }
    },
    {
      name: 'stash',
      description: 'The stash tabs the app last read (stash reader), with items. Filter by tab name or item name to keep it short.',
      inputSchema: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Only items whose name or base contains this' },
          tab: { type: 'string', description: 'Only tabs whose name contains this' },
          limit: { type: 'number', description: 'Most items to return, default 200, max 2000' },
          league: { type: 'string', description: 'Default: the app\'s league' }
        }
      },
      readOnly: true,
      run: async (a) => {
        const league = await leagueOf(deps, a.league)
        const cache = await deps.stashCache(league)
        if (!cache) return { league, tabs: [], note: 'No stash read for this league. Turn on the stash reader in the app (Net worth) and read once.' }
        const tabName = str(a.tab)
        const search = str(a.search)
        const tabs = cache.tabs.filter(t => !tabName || has(t.name, tabName))
        const limit = num(a.limit, 200, 1, 2000)
        const items: unknown[] = []
        let matched = 0
        for (const t of tabs) {
          for (const i of t.items) {
            if (search && !has(`${i.name} ${i.typeLine} ${i.baseType}`, search)) continue
            matched++
            if (items.length >= limit) continue
            items.push({
              tab: t.name,
              name: i.name || undefined,
              type: i.typeLine,
              kind: FRAMES[i.frame] ?? String(i.frame),
              stack: i.stack > 1 ? i.stack : undefined,
              ilvl: i.ilvl,
              gemLevel: i.gemLevel,
              quality: i.quality,
              mapTier: i.mapTier,
              links: i.links && i.links > 1 ? i.links : undefined,
              corrupted: i.corrupted || undefined,
              unidentified: i.unidentified || undefined
            })
          }
        }
        return {
          league,
          account: cache.account,
          tabs: tabs.map(t => ({ name: t.name, type: t.type, readAt: iso(t.readAt), items: t.items.length })),
          matched,
          items
        }
      }
    },
    {
      name: 'net_worth',
      description: 'Net worth the app recorded from stash reads: a total per day, today\'s reads, and each tab\'s value at the last read, in chaos.',
      inputSchema: { type: 'object', properties: { league: { type: 'string', description: 'Default: the app\'s league' } } },
      readOnly: true,
      run: async (a) => {
        const league = await leagueOf(deps, a.league)
        const hist = await deps.op('doc-get', { collection: 'net-worth', key: league }) as { days?: Record<string, { at: number, chaos: number, divine: number | null }>, today?: { points?: Array<{ at: number, chaos: number }> }, lastDiff?: unknown } | null
        const ledger = await deps.op('doc-get', { collection: 'net-worth', key: `${league}-ledger` }) as { tabChaos?: { last?: Record<string, number> }, points?: Array<{ at: number, chaos: number, netChaos: number | null, top?: string[] }> } | null
        if (!hist && !ledger) return { league, note: 'No net worth recorded for this league yet.' }
        const cache = await deps.stashCache(league)
        const tabNames = new Map(cache?.tabs.map(t => [t.id, t.name]) ?? [])
        const days = Object.entries(hist?.days ?? {}).sort(([x], [y]) => x.localeCompare(y)).slice(-30)
        return {
          league,
          byDay: days.map(([date, d]) => ({ date, chaos: round(d.chaos), divine: d.divine ? round(d.chaos / d.divine) : null })),
          today: (hist?.today?.points ?? []).map(p => ({ at: iso(p.at), chaos: round(p.chaos) })),
          recentReads: (ledger?.points ?? []).slice(-10).map(p => ({ at: iso(p.at), chaos: round(p.chaos), change: round(p.netChaos), top: p.top })),
          byTab: Object.entries(ledger?.tabChaos?.last ?? {}).map(([id, chaos]) => ({ tab: tabNames.get(id) ?? id, chaos: round(chaos) })).sort((x, y) => (y.chaos ?? 0) - (x.chaos ?? 0))
        }
      }
    },
    {
      name: 'saved_searches',
      description: 'Trade searches saved in the app, with folder, tags, notes and trade site link.',
      inputSchema: { type: 'object', properties: { search: { type: 'string', description: 'Only searches whose name, folder, tags or notes contain this' } } },
      readOnly: true,
      run: async (a) => {
        const search = str(a.search)
        const entries = widgetsOf(await deps.config(), 'woke-trade-searches').flatMap(w => Array.isArray(w.entries) ? w.entries as Array<Record<string, unknown>> : [])
        const rows = entries
          .map(e => ({ name: str(e.name), folder: str(e.category) || 'Uncategorized', tags: Array.isArray(e.tags) ? e.tags : [], notes: str(e.notes) || undefined, url: str(e.url), pinned: e.pinned === true || undefined, opened: typeof e.openCount === 'number' ? e.openCount : undefined, lastOpened: iso(e.lastOpened as number) ?? undefined }))
          .filter(e => !search || has(`${e.name} ${e.folder} ${e.tags.join(' ')} ${e.notes ?? ''}`, search))
        return { count: rows.length, searches: rows }
      }
    },
    {
      name: 'pob_builds',
      description: 'Path of Building builds in the app\'s builds folder: path, class, level, main skill and PoB\'s stats.',
      inputSchema: { type: 'object', properties: { search: { type: 'string', description: 'Only builds whose name, folder, class or skill contains this' } } },
      readOnly: true,
      run: async (a) => {
        const res = await deps.op('pob-list', { dir: await pobDir(deps) }) as { builds: Array<{ relPath: string, name: string, folder: string, mtime: number, className: string, ascendClassName: string, level: number | null, mainSkill: string, stats: Record<string, number> }> }
        const search = str(a.search)
        const builds = res.builds
          .filter(b => !search || has(`${b.name} ${b.folder} ${b.className} ${b.ascendClassName} ${b.mainSkill}`, search))
          .sort((x, y) => y.mtime - x.mtime)
        return { count: builds.length, builds: builds.map(b => ({ path: b.relPath, class: b.ascendClassName || b.className, level: b.level, mainSkill: b.mainSkill, savedAt: iso(b.mtime), stats: b.stats })) }
      }
    },
    {
      name: 'pob_build',
      description: 'One Path of Building build. part: summary (default), skills, items, tree (passive trees with named keystones, notables, masteries and jewels), notes, or all.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The build\'s path from pob_builds' },
          part: { type: 'string', enum: ['summary', 'skills', 'items', 'tree', 'notes', 'all'] },
          set: { type: 'string', description: 'For skills, items or tree: only the set whose title contains this. Default: the active one' }
        },
        required: ['path']
      },
      readOnly: true,
      run: async (a) => {
        const relPath = str(a.path)
        if (!relPath) throw new Error('path is required')
        const b = await deps.op('pob-read', { dir: await pobDir(deps), relPath }) as PobDetailsLike
        const part = str(a.part) || 'summary'
        const pick = <T extends { title: string, isActive: boolean, divider?: boolean }>(sets: T[]): T[] => {
          const real = sets.filter(s => !s.divider)
          const want = str(a.set)
          if (want) return real.filter(s => has(s.title, want))
          const active = real.filter(s => s.isActive)
          return active.length ? active : real.slice(0, 1)
        }
        const out: Record<string, unknown> = {
          path: relPath,
          class: b.ascendClassName || b.className,
          level: b.level,
          mainSkill: b.mainSkill,
          stats: b.stats,
          pantheon: [b.pantheonMajor, b.pantheonMinor].filter(Boolean)
        }
        if (part === 'summary') {
          out.skillSets = b.skillSets.filter(s => !s.divider).map(s => s.title + (s.isActive ? ' (active)' : ''))
          out.itemSets = b.itemSets.filter(s => !s.divider).map(s => s.title + (s.isActive ? ' (active)' : ''))
          out.trees = b.trees.filter(s => !s.divider).map(s => s.title + (s.isActive ? ' (active)' : ''))
          out.parts = 'Ask for part skills, items, tree or notes for the rest.'
        }
        if (part === 'skills' || part === 'all') {
          out.skills = pick(b.skillSets).map(s => ({ set: s.title, groups: s.groups.map(g => ({ label: g.label || undefined, slot: g.slot || undefined, main: g.isMain || undefined, enabled: g.enabled, gems: g.gems.map(gem => `${gem.name}${gem.level != null ? ` ${gem.level}` : ''}${gem.quality ? `/${gem.quality}` : ''}${gem.enabled ? '' : ' (off)'}`) })) }))
        }
        if (part === 'items' || part === 'all') {
          out.items = pick(b.itemSets).map(s => ({ set: s.title, slots: s.slots.map(sl => ({ slot: sl.slot, ...itemOut(sl.item) })) }))
        }
        if (part === 'tree' || part === 'all') {
          const tree = await deps.passiveTree()
          out.trees = pick(b.trees).map(t => treeOut(t, tree))
        }
        if (part === 'notes' || part === 'all') out.notes = b.notes
        return out
      }
    },
    {
      name: 'current_character',
      description: 'The character you play now, as the app last read it from the game account: gear, socketed gems and passive tree with names. Separate from the PoB builds. part: summary (default), gear, gems, tree, or all.',
      inputSchema: { type: 'object', properties: { part: { type: 'string', enum: ['summary', 'gear', 'gems', 'tree', 'all'] } } },
      readOnly: true,
      run: async (a) => {
        const c = await deps.character()
        if (!c || c.version !== 1) return { note: 'No character read yet. The character sync reads it from your account.' }
        const part = str(a.part) || 'summary'
        const out: Record<string, unknown> = { ...c.character, account: c.account, readAt: iso(c.readAt) }
        if (part === 'summary') out.parts = 'Ask for part gear, gems or tree for the rest.'
        if (part === 'gear' || part === 'all') out.gear = (c.gear ?? []).map(g => ({ slot: g.slot, ...itemOut(g.item) }))
        if (part === 'gems' || part === 'all') {
          out.gems = (c.gems ?? []).map(g => ({ slot: g.slot, gems: g.gems.map(gem => `${gem.name}${gem.level != null ? ` ${gem.level}` : ''}${gem.quality ? `/${gem.quality}` : ''}`) }))
        }
        if (part === 'tree' || part === 'all') {
          const t = c.tree ?? {}
          const named = treeOut({
            title: 'Live character',
            url: '',
            isActive: true,
            nodes: t.nodes ?? [],
            jewels: [],
            sockets: (t.jewels ?? []).map(j => ({ node: j.x, item: j.item })),
            masteries: Object.fromEntries(Object.entries(t.masteries ?? {}).map(([k, v]) => [Number(k), v]))
          }, await deps.passiveTree())
          delete named.url
          delete named.title
          delete named.active
          out.tree = { ...named, clusterPassives: t.clusterNodes?.length || undefined }
        }
        return out
      }
    },
    {
      name: 'atlas_strategies',
      description: 'Atlas strategies saved in the app: name, folder, league, tags, costs, device and notes. With name, also the strategy\'s atlas passives by name (needs the overlay running).',
      inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'One strategy, by name or part of it' } } },
      readOnly: true,
      run: async (a) => {
        const list = widgetsOf(await deps.config(), 'woke-atlas-strategies').flatMap(w => Array.isArray(w.strategies) ? w.strategies as Array<Record<string, unknown>> : [])
        const want = str(a.name)
        const rows = list.filter(s => !want || has(str(s.name), want))
        const brief = (s: Record<string, unknown>) => ({ name: str(s.name), folder: str(s.folder) || undefined, league: str(s.league) || undefined, tags: Array.isArray(s.tags) ? s.tags : [], costs: str(s.scarabs) || undefined, device: str(s.device) || undefined, notes: str(s.notes) || undefined, treeUrl: str(s.treeUrl) || undefined })
        if (!want || rows.length !== 1) return { count: rows.length, strategies: rows.map(brief), note: want && rows.length > 1 ? 'Several match: give the full name for its passives.' : undefined }
        const s = rows[0]
        let passives: unknown = null
        if (str(s.treeUrl)) {
          try {
            passives = await deps.askOverlay('atlas-nodes', { treeUrl: str(s.treeUrl) })
          } catch (e) {
            passives = { error: e instanceof Error ? e.message : String(e) }
          }
        }
        return { ...brief(s), passives }
      }
    },
    {
      name: 'settings',
      description: 'App settings Claude may suggest changing, as key: current value. Keys are "<window type>.<field>" or "app.<field>".',
      inputSchema: { type: 'object', properties: { search: { type: 'string', description: 'Only keys containing this' } } },
      readOnly: true,
      run: async (a) => {
        const all = listSettings((await deps.config()) ?? {})
        const search = str(a.search)
        return Object.fromEntries(Object.entries(all).filter(([k]) => !search || has(k, search)))
      }
    },
    {
      name: 'trade_search',
      description: 'Runs a search on the trade site through the app\'s rate limiter and returns the cheapest listings\' prices (no seller names). Refused when the limit is close or the last search was under 10 s ago, so it never slows the player\'s own price checks; wait and try again. query is the same body as suggest_trade_search.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'object', description: 'Trade site search body with "query" and optional "sort"' },
          league: { type: 'string', description: 'Default: the app\'s league' },
          count: { type: 'number', description: 'Listings to fetch, 1 to 10, default 10' }
        },
        required: ['query']
      },
      readOnly: true,
      run: async (a) => await deps.askOverlay('trade-search', { query: a.query, league: a.league, count: a.count }, 90_000)
    },
    {
      name: 'suggest_trade_search',
      description: 'Adds a trade search to the app\'s Suggestions card. Apply opens it on the trade site. query is the trade site\'s search body: { "query": { "status": { "option": "online" }, "name": ..., "type": ..., "stats": [...], "filters": {...} }, "sort": { "price": "asc" } }.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short, e.g. "Hubris Circlet, +2 minion gems"' },
          why: { type: 'string', description: 'One line on why' },
          query: { type: 'object', description: 'Trade site search body with "query" and optional "sort"' },
          league: { type: 'string', description: 'Default: the app\'s league' }
        },
        required: ['title', 'query']
      },
      readOnly: false,
      run: async (a) => outcome(await deps.suggestions.add('trade-search', a, () => null))
    },
    {
      name: 'suggest_filter_change',
      description: 'Adds a loot filter change to the Suggestions card; Apply adds it to the app\'s loot filter and saves. edit is one editor change keyed by NeverSink tags, e.g. { "kind": "visibility", "type": "currency", "tier": "t5", "visibility": "Hide" }, { "kind": "move", "type": "currency", "base": "Orb of Alchemy", "from": "t4", "to": "t3" }, or { "kind": "stack", "type": "currency->stackedthree", "tier": "t5", "size": 3 }.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          why: { type: 'string' },
          edit: { type: 'object', description: 'kind: move | visibility | stack | group | style | item; type: NeverSink $type tag; plus the fields of that kind' }
        },
        required: ['title', 'edit']
      },
      readOnly: false,
      run: async (a) => outcome(await deps.suggestions.add('filter-change', a, () => null))
    },
    {
      name: 'suggest_setting',
      description: 'Adds a settings change to the Suggestions card. key must come from the settings tool, value of the same type.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          why: { type: 'string' },
          key: { type: 'string' },
          value: { type: ['string', 'number', 'boolean'] }
        },
        required: ['title', 'key', 'value']
      },
      readOnly: false,
      run: async (a) => outcome(await deps.suggestions.add('setting', a, await checkSetting()))
    },
    {
      name: 'suggestions',
      description: 'Suggestions sent so far and whether the player applied or dismissed them, newest first.',
      inputSchema: { type: 'object', properties: { status: { type: 'string', enum: ['new', 'applied', 'dismissed'] } } },
      readOnly: true,
      run: async (a) => {
        const status = str(a.status)
        return (await deps.suggestions.list()).filter(s => !status || s.status === status).reverse().slice(0, 50).map(outcome)
      }
    }
  ]
  return tools
}

interface PriceLogEntryLike { key: string, league: string, label: string, ts: number, fair: number, low: number, high: number, n: number }

async function priceLog (deps: LinkDeps): Promise<PriceLogEntryLike[]> {
  const v = await deps.op('doc-get', { collection: 'price-log', key: 'checks' })
  return Array.isArray(v) ? v.filter((e): e is PriceLogEntryLike => e && typeof e.label === 'string' && typeof e.fair === 'number') : []
}

function shortCheck (e: PriceLogEntryLike) {
  return { label: e.label, league: e.league, at: iso(e.ts), fair: round(e.fair), low: round(e.low), high: round(e.high), listings: e.n }
}

async function pobDir (deps: LinkDeps): Promise<string | undefined> {
  const w = widgetsOf(await deps.config(), 'woke-pob-builds')[0]
  const dir = str(w?.buildsDir).trim()
  return dir || undefined
}

interface PobItemLike { rarity: string, name: string, base: string, sockets: string, implicits: string[], mods: string[], modKinds?: string[], implicitKinds?: string[], itemLevel?: number, corrupted?: boolean, influences?: string[], quality?: number, radius?: string }
interface PobDetailsLike {
  className: string, ascendClassName: string, level: number | null, mainSkill: string, stats: Record<string, number>
  pantheonMajor: string, pantheonMinor: string, notes: string
  skillSets: Array<{ title: string, isActive: boolean, divider?: boolean, groups: Array<{ label: string, slot: string, enabled: boolean, isMain: boolean, gems: Array<{ name: string, level: number | null, quality: number | null, enabled: boolean }> }> }>
  itemSets: Array<{ title: string, isActive: boolean, divider?: boolean, slots: Array<{ slot: string, item: PobItemLike }> }>
  trees: Array<{ title: string, url: string, isActive: boolean, divider?: boolean, nodes: number[], jewels: PobItemLike[], sockets?: Array<{ node: number, item: PobItemLike }>, masteries?: Record<number, number> }>
}

function itemOut (i: PobItemLike) {
  const tag = (kinds: string[] | undefined, n: number) => kinds?.[n] ? ` (${kinds[n] === 'crafted' ? 'crafted' : kinds[n]})` : ''
  return {
    rarity: i.rarity.toLowerCase() || undefined,
    name: i.name,
    base: i.base || undefined,
    sockets: i.sockets || undefined,
    itemLevel: i.itemLevel,
    quality: i.quality,
    influences: i.influences?.length ? i.influences : undefined,
    corrupted: i.corrupted || undefined,
    implicits: i.implicits.length ? i.implicits.map((m, n) => m + tag(i.implicitKinds, n)) : undefined,
    mods: i.mods.map((m, n) => m + tag(i.modKinds, n))
  }
}

export function treeOut (
  t: PobDetailsLike['trees'][number],
  tree: { nodes: Map<number, TreeNodeInfo>, masteryEffects: Record<string, string[]> } | null
) {
  const out: Record<string, unknown> = { title: t.title, active: t.isActive, url: t.url, points: t.nodes.length }
  if (!tree) {
    out.note = 'Passive tree data is missing, so nodes are ids only.'
    out.nodeIds = t.nodes
    return out
  }
  const keystones: string[] = []
  const notables: string[] = []
  const ascendancy: string[] = []
  const masteries: string[] = []
  let small = 0
  for (const id of t.nodes) {
    const n = tree.nodes.get(id)
    if (!n) continue
    switch (n.kind) {
      case 'key': keystones.push(n.name); break
      case 'notable': notables.push(n.name); break
      case 'asc': if (n.name) ascendancy.push(n.name); break
      case 'mastery': {
        const effect = t.masteries?.[id]
        const text = effect != null ? tree.masteryEffects[String(effect)] : undefined
        masteries.push(text?.length ? `${n.name}: ${text.join(' / ')}` : n.name)
        break
      }
      case 'small': small++; break
    }
  }
  return {
    ...out,
    keystones,
    notables,
    ascendancy,
    masteries,
    smallPassives: small,
    jewels: (t.sockets ?? []).map(s => ({ socket: tree.nodes.get(s.node)?.name || s.node, ...itemOut(s.item) }))
  }
}
