export interface HostConfig {
  shortcuts: ShortcutAction[]
  restoreClipboard: boolean
  clientLog: string | null
  gameConfig: string | null
  stashScroll: boolean
  overlayKey: string
  logKeys: boolean
  windowTitle: string
  language: string
  // woke: false when no enabled module needs Client.txt, so main stops tailing it
  wokeGameLog?: boolean
  // woke: the icon picked in Settings > Look
  appIcon?: string
}

export interface ShortcutAction {
  shortcut: string
  keepModKeys?: true
  action: {
    type: 'copy-item'
    focusOverlay?: boolean
    target: string
  } | {
    type: 'trigger-event'
    target: string
    // Make the overlay interactive too (a panel you work in, not a glance).
    focusOverlay?: boolean
  } | {
    type: 'stash-search'
    text: string
  } | {
    type: 'toggle-overlay'
  } | {
    type: 'paste-in-chat'
    text: string
    send: boolean
  } | {
    type: 'test-only'
  }
}

export type UpdateInfo =
  {
    state: 'initial' | 'checking-for-update'
  } | {
    state: 'update-available'
    version: string
    noDownloadReason: 'not-supported' | 'disabled-by-flag' | null
  } | {
    state: 'update-downloaded'
    version: string
  } | {
    state: 'update-not-available' | 'error'
    checkedAt: number
  }

// woke: what happened to the settings file at startup, for a notice.
// newer and upgrade-failed come from the page; the rest from the host.
export type ConfigNotice = 'restored' | 'reset' | 'unreadable' | 'newer' | 'upgrade-failed' | 'port-busy'

export interface HostState {
  contents: string | null
  version: string
  updater: UpdateInfo
  configNotice?: ConfigNotice | null
}

export type IpcEvent =
  IpcConfigFlush |
  IpcConfigFlushed |
  // events that have meaning only in Overlay mode:
  IpcOverlayAttached |
  IpcFocusChange |
  IpcVisibility |
  IpcFocusGame |
  IpcHideExclusiveWidget |
  IpcTrackArea |
  // events used by any type of Client:
  IpcSaveConfig |
  IpcUpdaterState |
  IpcGameLog |
  IpcGameLogOpened |
  IpcClientIsActive |
  IpcLogEntry |
  IpcHostConfig |
  IpcWidgetAction |
  IpcItemText |
  IpcConfigChanged |
  IpcUserAction |
  // woke modules (see main/src/woke, renderer/src/web/woke)
  IpcWokeRequest |
  IpcWokeResponse |
  IpcWokeEvent |
  IpcWokePanelKeys |
  IpcWokeHoverZones |
  IpcWokeHover |
  IpcWokeHoverClick |
  IpcWokeHoverContext

export type IpcEventPayload<Name extends IpcEvent['name'], T extends IpcEvent = IpcEvent> =
  T extends { name: Name, payload: infer P } ? P : never

type IpcOverlayAttached =
  Event<'MAIN->OVERLAY::overlay-attached'>

type IpcFocusChange =
  Event<'MAIN->OVERLAY::focus-change', {
    game: boolean
    overlay: boolean
    usingHotkey: boolean
  }>

type IpcVisibility =
  Event<'MAIN->OVERLAY::visibility', {
    isVisible: boolean
  }>

type IpcFocusGame =
  Event<'OVERLAY->MAIN::focus-game'>

type IpcHideExclusiveWidget =
  Event<'MAIN->OVERLAY::hide-exclusive-widget'>

type IpcTrackArea =
  Event<'OVERLAY->MAIN::track-area', {
    holdKey: string
    closeThreshold: number
    from: { x: number, y: number }
    area: { x: number, y: number, width: number, height: number }
    dpr: number
  }>

type IpcHostConfig =
  Event<'CLIENT->MAIN::update-host-config', HostConfig>

type IpcClientIsActive =
  Event<'CLIENT->MAIN::used-recently', {
    isOverlay: boolean
  }>

type IpcSaveConfig =
  Event<'CLIENT->MAIN::save-config', {
    contents: string
    isTemporary: boolean
    // woke: write it without telling the page, which would swap its config.
    quiet?: boolean
  }>

// woke: the app is quitting: write anything not saved yet, then answer.
type IpcConfigFlush =
  Event<'MAIN->CLIENT::config-flush', undefined>

type IpcConfigFlushed =
  Event<'CLIENT->MAIN::config-flushed', undefined>

type IpcConfigChanged =
  Event<'MAIN->CLIENT::config-changed', {
    contents: string
  }>

type IpcLogEntry =
  Event<'MAIN->CLIENT::log-entry', {
    message: string
  }>

type IpcWidgetAction =
  Event<'MAIN->CLIENT::widget-action', {
    target: string
  }>

type IpcItemText =
  Event<'MAIN->CLIENT::item-text-failed', { target: string }> |
  Event<'MAIN->CLIENT::item-text', {
    target: string
    clipboard: string
    item?: unknown
    position: { x: number, y: number }
    focusOverlay: boolean
  }>

type IpcGameLog =
  Event<'MAIN->CLIENT::game-log', {
    lines: string[]
  }>

// The log watcher has a Client.txt open: a good time to read one that was
// missing when asked for.
type IpcGameLogOpened =
  Event<'MAIN->CLIENT::game-log-opened', {
    path: string
  }>

type IpcUpdaterState =
  Event<'MAIN->CLIENT::updater-state', UpdateInfo>

// Hotkeyable actions are defined in `ShortcutAction`.
// Actions below are triggered by user interaction with the UI.
type IpcUserAction =
  Event<'CLIENT->MAIN::user-action', {
    action: 'check-for-update' | 'update-and-restart' | 'quit'
  } | {
    action: 'stash-search'
    text: string
  } | {
    // woke: loot filter editor reloads the saved filter with /itemfilter.
    action: 'paste-in-chat'
    text: string
    // woke: trade replies go out right away instead of waiting for a pause
    // in typing (the key that sent them was just released).
    immediate?: boolean
  }>

interface Event<TName extends string, TPayload = undefined> {
  name: TName
  payload: TPayload
}

// Generic request/response channel for woke modules, so new modules don't
// need new event types. `op` names the handler in main/src/woke.
type IpcWokeRequest =
  Event<'CLIENT->MAIN::woke-request', {
    id: number
    op: string
    args: unknown
  }>

// Pushed from main to the overlay, e.g. map scan readings.
type IpcWokeEvent =
  Event<'MAIN->CLIENT::woke-event', {
    topic: string
    data: unknown
  }>

type IpcWokeResponse =
  Event<'MAIN->CLIENT::woke-response', {
    id: number
    ok: boolean
    data?: unknown
    error?: string
  }>

// Hover zones: lets a woke widget react to the mouse while the game has
// focus (the overlay is click-through then, so the DOM sees no hover).
// Keys an open panel wants while the overlay has focus: the game's hotkeys are
// off then, and the page gets the keyboard.
type IpcWokePanelKeys =
  Event<'OVERLAY->MAIN::woke-panel-keys', { keys: string[] }> |
  Event<'MAIN->OVERLAY::woke-panel-key', { key: string }>

type IpcWokeHoverZones =
  Event<'OVERLAY->MAIN::woke-open-overlay', undefined> |
  Event<'OVERLAY->MAIN::woke-hover-zones', {
    // Replaces all zones owned by `owner`. Rects in CSS pixels, screen space.
    owner: string
    zones: Array<{ id: string, x: number, y: number, width: number, height: number, activate?: boolean }>
    dpr: number
  }>

type IpcWokeHover =
  Event<'MAIN->OVERLAY::woke-hover', {
    id: string
    inside: boolean
  }>

// The left mouse button went down on a zone, seen by the global mouse hook.
type IpcWokeHoverClick =
  Event<'MAIN->OVERLAY::woke-hover-click', {
    id: string
    // False: the mouse was not taken, so the game got this click too.
    taken: boolean
  }>

// The right mouse button went down on a zone that had already taken the mouse.
type IpcWokeHoverContext =
  Event<'MAIN->OVERLAY::woke-hover-context', {
    id: string
  }>
