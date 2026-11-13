// Every op on the CLIENT->MAIN::woke-request channel, with its arguments and
// what main answers. The renderer's hostRequest and main's handler table are
// both typed from this map, so a wrong op name or argument shape fails
// typecheck. Main still checks args at run time: they come over a socket.

// Records the overlay owns (sessions, trades, market snapshots, docs...):
// main stores and returns them as written, so their shape lives with the
// overlay code that reads them. Also used for large answers whose type lives
// with the code that builds it (PoB details, stash reader status).
export type Json = unknown

// An op that takes nothing. Callers pass null or {}.
export type NoArgs = null | undefined | Record<string, never>

interface Op<A, R> { args: A, result: R }

type Ok = boolean
type ScanStatus = { running: boolean, paused?: boolean, rolling?: boolean, auto?: boolean }
type PobArgs = { dir?: string, relPath: string }
type FilterDir = { dir?: string }
type DocKey = { collection: string, key: string }
type League = { league: string }

export interface WokePersonalState {
  on: boolean
  // personal.flag: can't be turned off.
  forced: boolean
  unlocked: boolean
}

export interface WokeAuthStatus {
  signedIn: boolean
  account: string | null
}

export interface WokePathStat {
  exists: boolean
  isDir: boolean
  modified: number | null
}

export interface WokePendingCrash {
  id: string
  at: number
  title: string
  count: number
}

export interface WokeFoundLog {
  path: string
  source: 'running' | 'standalone' | 'steam' | 'folder'
  modified: number
  size: number
}

export interface WokeTimelessAsk {
  pobExe?: string
  jewels: Array<{ mods: string[], nodes: Array<{ id: number, kind: 'small' | 'notable' | 'key', name: string }> }>
}

export interface WokeOps {
  // PoB builds
  'pob-list': Op<{ dir?: string }, { dir: string, builds: Json[] }>
  'pob-read': Op<PobArgs, Json>
  'pob-open': Op<PobArgs & { pobExe?: string }, void>
  'pob-show': Op<PobArgs, void>
  'pob-import': Op<{ dir?: string, input: string, name?: string }, { relPath: string }>
  'pob-rename': Op<PobArgs & { name: string }, { relPath: string }>
  'pob-move': Op<PobArgs & { folder: string }, { relPath: string }>
  'pob-duplicate': Op<PobArgs, { relPath: string }>
  'pob-delete': Op<PobArgs, { xml: string }>
  'pob-restore': Op<PobArgs & { xml: string }, void>
  'pob-timeless': Op<WokeTimelessAsk, Json>

  // Loot filter files and sounds
  'filter-list': Op<FilterDir, { dir: string, files: Json[] }>
  'filter-read': Op<FilterDir & { name: string, online?: boolean }, { text: string, mtime: number }>
  'filter-write': Op<FilterDir & { name: string, text: string }, { path: string }>
  'filter-folder': Op<FilterDir, void>
  'filter-sounds': Op<FilterDir, { files: Array<{ name: string, size: number }> }>
  'filter-sound-read': Op<FilterDir & { name: string }, { data: string, mime: string }>
  'filter-sound-install': Op<FilterDir & { name: string, data: string }, { written: boolean }>
  'game-filter': Op<NoArgs, { name: string | null, loaded: boolean | null }>

  // NeverSink filter downloads
  'ns-latest': Op<NoArgs, { version: string, changes: string }>
  'ns-download': Op<{ style?: string }, { version: string }>
  'ns-read': Op<{ version: string, style?: string, level: number }, { text: string }>
  'ns-cached': Op<NoArgs, Array<{ version: string, styles: string[] }>>
  'ns-prune': Op<{ keep?: number }, void>

  // App and settings
  'perf-stats': Op<NoArgs, Json>
  'ocr-check': Op<NoArgs, { ok: boolean, message: string | null }>
  'hotkey-failures': Op<NoArgs, { failed: string[] }>
  'game-binds': Op<NoArgs, Json[]>
  'lab-layout-image': Op<{ url: string }, string | null>
  'path-stat': Op<{ path?: string | null }, WokePathStat>
  'browse-path': Op<{ kind?: 'file' | 'dir', title?: string, defaultPath?: string, extensions?: string[] }, string | null>
  'live-data-cached': Op<{ language: unknown, bundled: number }, number | null>
  'live-data-check': Op<{ language: unknown, bundled: number, bundledShared?: unknown }, number | null>
  'game-log-tail': Op<{ bytes?: number } | NoArgs, { path: string | null, lines: string[] }>
  'personal-flag': Op<NoArgs, WokePersonalState>
  'personal-set': Op<{ on: boolean }, WokePersonalState>
  'experimental-set': Op<{ unlocked: boolean }, WokePersonalState>

  // Setup window and crash reports
  'setup-game-logs': Op<NoArgs, WokeFoundLog[]>
  'setup-browse-log': Op<NoArgs, string | null>
  'setup-prefs': Op<NoArgs, Json>
  'setup-prefs-set': Op<Record<string, unknown>, Json>
  'setup-open': Op<NoArgs, Ok>
  'setup-finish': Op<NoArgs, Ok>
  'crash-pending': Op<NoArgs, WokePendingCrash | null>
  'crash-dismiss': Op<NoArgs, Ok>
  'crash-report': Op<{ id?: string | null, context?: string }, Ok>
  'crash-folder': Op<NoArgs, Ok>
  'renderer-error': Op<{ text: string }, Ok>

  // Screen readers
  'map-scan-start': Op<NoArgs, ScanStatus>
  'map-scan-stop': Op<NoArgs, ScanStatus>
  'map-scan-reread': Op<NoArgs, { ok: true }>
  'map-scan-status': Op<NoArgs, ScanStatus>
  'map-scan-auto-start': Op<NoArgs, ScanStatus>
  'map-scan-auto-stop': Op<NoArgs, ScanStatus>
  'map-scan-roll': Op<NoArgs, { running: boolean, rolling: boolean }>
  'essence-scan-start': Op<NoArgs, ScanStatus>
  'essence-scan-stop': Op<NoArgs, ScanStatus>
  'essence-scan-reread': Op<NoArgs, { ok: true }>
  'essence-scan-status': Op<NoArgs, ScanStatus>
  'essence-scan-auto-start': Op<NoArgs, ScanStatus>
  'essence-scan-auto-stop': Op<NoArgs, ScanStatus>
  'essence-scan-once': Op<NoArgs, { labels: Array<{ lines: string[], at: { x: number, y: number } }> }>
  'area-mods-read': Op<{ delayMs?: number }, { lines: string[] | null, ocrMissing?: boolean }>
  'stash-read': Op<NoArgs, Json>
  'stash-watch-stop': Op<NoArgs, null>
  'tree-overlay-points': Op<{ x: number[], y: number[], r: number[] }, null>
  'tree-overlay-fit': Op<{ probes: number[][], fresh?: boolean }, Json>
  'tree-overlay-stop': Op<NoArgs, null>
  'tree-overlay-tip': Op<boolean, null>

  // Stores of overlay records
  'doc-get': Op<DocKey, Json>
  'doc-list': Op<{ collection: string }, Json[]>
  'doc-put': Op<DocKey & { value: Json }, Ok>
  'doc-delete': Op<DocKey, Ok>
  'death-recap-read': Op<NoArgs, { deaths: Json[], runs: Json[] }>
  'death-recap-write': Op<{ deaths: Json[], runs: Json[] }, Ok>
  'market-save': Op<{ snapshot: Json, daily: Json[] }, Ok>
  'market-latest': Op<League & { count: number }, Json[]>
  'market-at': Op<League & { ts: number }, Json>
  'market-daily-date': Op<League & { date: string }, Json[]>
  'market-daily-item': Op<League & { type: string, name: string, variant?: string }, Json[]>
  'market-daily-all': Op<League, Json[]>
  'market-import-status': Op<NoArgs, { imported: boolean }>
  'market-import': Op<{ snapshots?: Json[], daily?: Json[] }, Ok>
  'market-import-done': Op<NoArgs, Ok>
  'sessions-list': Op<NoArgs, Json[]>
  'sessions-save': Op<{ session: Json }, Json>
  'sessions-save-many': Op<{ sessions: Json[] }, Json>
  'sessions-delete': Op<{ id: string }, Json>
  'sessions-export': Op<{ rows: Array<Record<string, unknown>> }, string>
  'deck-sessions-list': Op<NoArgs, Json[]>
  'deck-sessions-save': Op<{ session: Json }, Json>
  'deck-sessions-delete': Op<{ id: string }, Json>
  'trades-list': Op<NoArgs, Json[]>
  'trades-add': Op<{ trade: Json }, Ok>
  'trades-delete': Op<{ id: string, league: string }, Ok>
  'offer-history-list': Op<NoArgs, Json[]>
  'offer-history-add': Op<{ offer: Json }, Ok>
  'offer-history-delete': Op<{ id: string }, Ok>

  // Stash reader (only registered while it's on)
  'stash-auth-status': Op<{ verify?: boolean }, WokeAuthStatus>
  'stash-sign-in': Op<NoArgs, WokeAuthStatus>
  'stash-sign-out': Op<NoArgs, WokeAuthStatus>
  'stash-reader-config': Op<{ league: string | null, accountName?: string }, Json>
  'stash-reader-status': Op<NoArgs, Json>
  'stash-reader-read': Op<NoArgs, Json>
  'stash-cache': Op<{ league?: string }, Json>
  'stash-tab-list': Op<NoArgs, Json>
  'stash-tab-choice': Op<{ league: string, template: string, ids: string[], set?: string }, Json>
  'stash-tab-set-save': Op<{ league: string | undefined, name: string, ids: string[] }, Json>
  'stash-tab-set-delete': Op<{ league: string | undefined, name: string }, Json>
  'worn-items': Op<{ character?: string }, Json>
}

export type WokeOp = keyof WokeOps
export type WokeArgs<K extends WokeOp> = WokeOps[K]['args']
export type WokeResult<K extends WokeOp> = WokeOps[K]['result']
export type WokeHandler<K extends WokeOp> = (args: WokeArgs<K>) => Promise<WokeResult<K>>
export type WokeHandlers = { [K in WokeOp]: WokeHandler<K> }
