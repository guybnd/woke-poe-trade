// The stash reader for players: its row is in Settings for everyone, it asks
// before turning on, and comes and goes at runtime without a restart. The
// experimental rows (the AI link) stay hidden until Economy is clicked 5 times.
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const host = vi.hoisted(() => ({
  state: { on: false, forced: false, unlocked: false },
  calls: [] as Array<{ op: string, args: unknown }>
}))
const cfg = vi.hoisted(() => ({ widgets: [] as Array<{ wmId: number, wmType: string }>, woke: { setupDone: true, off: ['net-worth'] } }))

vi.mock('@/web/background/IPC', async (orig) => {
  const real = await orig<typeof import('@/web/background/IPC')>()
  return { ...real, Host: { ...real.Host, isElectron: true } }
})
vi.mock('@/web/woke/shared/host', () => ({
  hostRequest: async (op: string, args: { on?: boolean, unlocked?: boolean } | null) => {
    host.calls.push({ op, args })
    if (op === 'personal-set' && !host.state.forced) host.state.on = args?.on === true
    if (op === 'experimental-set' && !host.state.forced) host.state.unlocked = args?.unlocked === true
    if (['personal-flag', 'personal-set', 'experimental-set'].includes(op)) return { ...host.state }
    return null
  }
}))
vi.mock('@/web/Config', () => ({
  AppConfig: () => cfg,
  pushHostConfig: () => { host.calls.push({ op: 'push-host-config', args: null }) },
  saveConfig: () => {}
}))

// The real registry, pages and widget pull in every window; stand-ins do here.
vi.mock('@/web/overlay/widget-registry', async () => {
  const { shallowReactive } = await import('vue')
  return { registry: { widgets: shallowReactive<Array<{ widget: { type: string } }>>([]) } }
})
vi.mock('@/web/woke/settings/pages', async () => {
  const { reactive } = await import('vue')
  const PAGE_BY_ID = reactive(new Map<string, unknown>())
  return {
    PAGE_BY_ID,
    addPage: (p: { id: string }) => { PAGE_BY_ID.set(p.id, p) },
    removePage: (id: string) => { PAGE_BY_ID.delete(id) }
  }
})
vi.mock('@/web/woke/net-worth/WidgetNetWorth.vue', () => ({ default: { widget: { type: 'woke-net-worth', instances: 'multi' } } }))
vi.mock('@/web/woke/editors', () => ({ addEditor () {}, removeEditor () {} }))
vi.mock('@/web/woke/net-worth/net-worth-editor.vue', () => ({ default: {} }))
vi.mock('@/web/woke/ui/window-anchor', () => ({ popupAnchor: () => ({ pos: 'cc', x: 50, y: 50 }) }))

// The settings list loads the UI kit, which touches the page on load.
await import('vue') // before the stubs: Vue checks for a real document on load
vi.stubGlobal('document', { documentElement: { style: { setProperty () {} }, dataset: {}, setAttribute () {} }, addEventListener () {} })
vi.stubGlobal('window', { addEventListener () {}, innerWidth: 1920, innerHeight: 1080, matchMedia: () => ({ matches: false, addEventListener () {} }) })
vi.stubGlobal('localStorage', { getItem: () => null, setItem () {}, removeItem () {} })

const { tapCounter, tapEconomy, UNLOCKED_TOAST } = await import('@/web/woke/switchboard/experimental')
const { stashSwitch, COPY } = await import('@/web/woke/switchboard/stash-switch')
const { MODULES, isWidgetTypeOn, isModuleOn, applyPreset } = await import('@/web/woke/modules')
const { registry } = await import('@/web/overlay/widget-registry')
const { PAGE_BY_ID } = await import('@/web/woke/settings/pages')
const personal = { ...await import('@/web/woke/personal'), ...await import('@/web/woke/personal-switch') }
const ModuleList = (await import('@/web/woke/switchboard/ModuleList.vue')).default

const hasModule = () => MODULES.some(m => m.id === 'net-worth')
const hasWidget = () => registry.widgets.some(w => w.widget.type === 'woke-net-worth')

describe('5-click unlock', () => {
  it('unlocks on the 5th click within 3 s', () => {
    let t = 0
    const tap = tapCounter(5, 3000, () => t)
    const results = [0, 400, 800, 1200, 1600].map(at => { t = at; return tap() })
    expect(results).toEqual([false, false, false, false, true])
  })

  it('slow clicks never unlock', () => {
    let t = 0
    const tap = tapCounter(5, 3000, () => t)
    const results = [0, 800, 1600, 2400, 3200, 4000, 4800].map(at => { t = at; return tap() })
    expect(results.every(r => !r)).toBe(true)
  })

  it('a pause starts the count again', () => {
    let t = 0
    const tap = tapCounter(5, 3000, () => t)
    for (const at of [0, 100, 200, 300]) { t = at; tap() }
    t = 5000
    expect(tap()).toBe(false)
    for (const at of [5100, 5200, 5300]) { t = at; expect(tap()).toBe(false) }
    t = 5400
    expect(tap()).toBe(true)
  })
})

describe('turn-on confirm', () => {
  it('asks before turning on, and Cancel leaves it off', async () => {
    const setOn = vi.fn(async () => {})
    const sw = stashSwitch(setOn)
    await sw.flip(true)
    expect(sw.asking.value).toBe(true)
    expect(setOn).not.toHaveBeenCalled()
    sw.cancel()
    expect(sw.asking.value).toBe(false)
    await sw.confirm()
    expect(setOn).not.toHaveBeenCalled()
  })

  it('Turn on turns it on', async () => {
    const setOn = vi.fn(async () => {})
    const sw = stashSwitch(setOn)
    await sw.flip(true)
    await sw.confirm()
    expect(setOn).toHaveBeenCalledWith(true)
    expect(sw.asking.value).toBe(false)
  })

  it('turning off does not ask', async () => {
    const setOn = vi.fn(async () => {})
    const sw = stashSwitch(setOn)
    await sw.flip(false)
    expect(setOn).toHaveBeenCalledWith(false)
    expect(sw.asking.value).toBe(false)
  })

  it('says so when it fails', async () => {
    const sw = stashSwitch(async () => { throw new Error('no') })
    await sw.flip(true)
    await sw.confirm()
    expect(sw.error.value).toMatch(/Couldn't/)
    expect(sw.asking.value).toBe(true)
  })

  it('keeps the agreed wording', () => {
    expect(COPY.confirmTitle).toBe('Turn on the stash reader?')
    expect(UNLOCKED_TOAST).toBe('Experimental settings unlocked')
    expect(COPY.confirmBody).toContain('Your login stays in the app and is never shared.')
    expect(COPY.confirmBody).toContain('No bans are known')
  })
})

describe('stash reader on and off at runtime', () => {
  // Turning it on loads Net worth's chunk, a cold transform that can take
  // longer than a test's 20 s on a busy machine, and every test after depends
  // on that one. Load it here, with time to spare.
  beforeAll(async () => { await import('@/web/woke/net-worth/enable') }, 120_000)
  beforeEach(() => { host.calls.length = 0 })

  it('loads nothing for a player who never turned it on', async () => {
    await personal.loadPersonal()
    expect(personal.personalOn.value).toBe(false)
    expect(hasModule()).toBe(false)
    expect(hasWidget()).toBe(false)
    expect(PAGE_BY_ID.has('net-worth')).toBe(false)
  })

  it('a Net worth widget left in config counts as off while the reader is off', () => {
    expect(isWidgetTypeOn({ woke: { setupDone: true, off: [] }, widgets: [] }, 'woke-net-worth')).toBe(false)
  })

  it('the Modules list shows the Net worth row to everyone, off, but no experimental rows', async () => {
    const config = { woke: { setupDone: true, off: [] }, widgets: [] }
    const html = await renderToString(createSSRApp({ render: () => h(ModuleList, { config, showStatus: true, includeApt: true }) }))
    expect(html).toContain('Net worth')
    expect(html).toContain('data-stash-reader')
    expect(html).toContain(COPY.descOff)
    expect(html).not.toContain('EXP')
    expect(html).not.toContain('data-experimental')
    expect(html).not.toContain('Hide experimental')
  })

  it('setup (no live status) shows no stash reader row', async () => {
    const config = { woke: { setupDone: false, off: [] }, widgets: [] }
    const html = await renderToString(createSSRApp({ render: () => h(ModuleList, { config, includeApt: true }) }))
    expect(html).not.toContain('data-stash-reader')
  })

  it('4 quick clicks on Economy do nothing, the 5th unlocks', async () => {
    for (const at of [10_000, 10_300, 10_600, 10_900]) tapEconomy(at, null)
    await Promise.resolve()
    expect(host.calls.some(c => c.op === 'experimental-set')).toBe(false)
    tapEconomy(11_200, null)
    await vi.waitFor(() => { expect(personal.experimentalUnlocked.value).toBe(true) })
    expect(host.calls.filter(c => c.op === 'experimental-set')).toEqual([{ op: 'experimental-set', args: { unlocked: true } }])
    // Unlocked: no more calls.
    for (const at of [12_000, 12_100, 12_200, 12_300, 12_400]) tapEconomy(at, null)
    expect(host.calls.filter(c => c.op === 'experimental-set')).toHaveLength(1)
    await personal.setExperimentalUnlocked(false)
    expect(personal.experimentalUnlocked.value).toBe(false)
  })

  // Two server renders of the settings list: about 2 s alone, past 20 s with
  // every core busy, and the tests after it build on this one.
  it('turning on without unlocking adds the module, widget and page right away', async () => {
    expect(personal.experimentalUnlocked.value).toBe(false)
    const config = { woke: { setupDone: true, off: [] }, widgets: [] }

    await personal.setStashReaderOn(true)
    expect(personal.personalOn.value).toBe(true)
    expect(hasModule()).toBe(true)
    expect(hasWidget()).toBe(true)
    expect(PAGE_BY_ID.has('net-worth')).toBe(true)
    // A hidden widget is placed (its dock icon), on even if an old config switched the module off.
    expect(cfg.widgets.filter(w => w.wmType === 'woke-net-worth')).toHaveLength(1)
    expect(isWidgetTypeOn(cfg, 'woke-net-worth')).toBe(true)
    expect(host.calls.some(c => c.op === 'push-host-config')).toBe(true)
    // Its switch is the stash reader's: module switches and presets leave it alone.
    const preset = { woke: { setupDone: true, off: ['net-worth'] }, widgets: [] }
    expect(isModuleOn(preset, 'net-worth')).toBe(true)
    applyPreset(preset, { id: 'none', label: 'None', on: [] })
    expect(preset.woke.off).not.toContain('net-worth')
    expect(preset.woke.off).toContain('market')

    const on = await renderToString(createSSRApp({ render: () => h(ModuleList, { config, showStatus: true, includeApt: true }) }))
    expect(on).toContain(COPY.descOn)
    // Its own row, not a second plain module row.
    expect(on.match(/aria-label="Net worth"/g)).toHaveLength(1)
  }, 60_000)

  it('turning off removes it all, keeps the placed widget off, and on again brings it back', async () => {
    await personal.setStashReaderOn(false)
    expect(personal.personalOn.value).toBe(false)
    expect(hasModule()).toBe(false)
    expect(hasWidget()).toBe(false)
    expect(PAGE_BY_ID.has('net-worth')).toBe(false)
    expect(cfg.widgets.filter(w => w.wmType === 'woke-net-worth')).toHaveLength(1)
    expect(isWidgetTypeOn(cfg, 'woke-net-worth')).toBe(false)

    await personal.setStashReaderOn(true)
    expect(hasModule()).toBe(true)
    expect(cfg.widgets.filter(w => w.wmType === 'woke-net-worth')).toHaveLength(1)
    expect(isWidgetTypeOn(cfg, 'woke-net-worth')).toBe(true)
  })

  it('only ever one Net worth window: turning on keeps the oldest and drops extras', async () => {
    const before = cfg.widgets.filter(w => w.wmType === 'woke-net-worth')[0]
    cfg.widgets.push({ wmId: 999, wmType: 'woke-net-worth' })
    await personal.setStashReaderOn(false)
    await personal.setStashReaderOn(true)
    const left = cfg.widgets.filter(w => w.wmType === 'woke-net-worth')
    expect(left).toHaveLength(1)
    expect(left[0].wmId).toBe(before.wmId)
  })

  it('extras already in config go once it has loaded', async () => {
    await personal.loadPersonal()
    cfg.widgets.push({ wmId: 1000, wmType: 'woke-net-worth' }, { wmId: 1001, wmType: 'woke-net-worth' })
    personal.tidyPersonal(cfg as never)
    expect(cfg.widgets.filter(w => w.wmType === 'woke-net-worth').map(w => w.wmId)).toHaveLength(1)
  })

  it('unlocking shows the experimental rows; hiding them leaves the reader on', async () => {
    expect(personal.personalOn.value).toBe(true)
    await personal.setExperimentalUnlocked(true)
    const config = { woke: { setupDone: true, off: [] }, widgets: [] }
    const html = await renderToString(createSSRApp({ render: () => h(ModuleList, { config, showStatus: true, includeApt: true }) }))
    expect(html).toContain('Hide experimental')
    expect(html.match(/aria-label="Net worth"/g)).toHaveLength(1)
    await personal.setExperimentalUnlocked(false)
    expect(personal.experimentalUnlocked.value).toBe(false)
    expect(personal.personalOn.value).toBe(true)
    expect(hasModule()).toBe(true)
  }, 60_000)
})
