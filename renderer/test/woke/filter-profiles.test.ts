// Named loot filter profiles: each a whole filter saved to its own file, the
// one there before profiles kept as it was.
import { describe, expect, it, vi } from 'vitest'
import { initLootFilterWidget, normalizeLootFilterWidget, outputName, NEVERSINK_OUTPUT } from '@/web/woke/loot-filter/widget'
import type { LootFilterWidget } from '@/web/woke/loot-filter/widget'
import { addProfile, copyName, profileFile, profileNameProblem, renameProfile, switchProfileData, deleteProfile } from '@/web/woke/loot-filter/profiles'
import { HISTORY_DOC, historyDocFor, useFilterHistory } from '@/web/woke/loot-filter/history-file'
import type { FilterEdit } from '@/web/woke/loot-filter/edits'

function widget (setup: (w: LootFilterWidget) => void = () => {}): LootFilterWidget {
  const w = { wmId: 3, wmType: 'woke-loot-filter', wmTitle: '', wmWants: 'hide', wmZorder: null, wmFlags: [] } as unknown as LootFilterWidget
  initLootFilterWidget(w)
  setup(w)
  normalizeLootFilterWidget(w)
  return w
}

const edit = (id: number): FilterEdit => ({ id, kind: 'visibility', type: 'currency', tier: `t${id}`, visibility: 'Hide' } as FilterEdit)

describe('loot filter profiles', () => {
  it('turns an older config into one profile that keeps its file and edits', () => {
    const old = widget()
    // What an older version saved: no profiles at all.
    const raw = JSON.parse(JSON.stringify(old)) as Record<string, unknown>
    delete raw.profiles
    delete raw.activeProfile
    raw.neversink = { ...(raw.neversink as object), on: true, level: 3 }
    raw.edits = [edit(1), edit(2)]
    const w = raw as unknown as LootFilterWidget
    normalizeLootFilterWidget(w)
    expect(w.profiles).toEqual([{ id: 1, name: 'NeverSink', legacyFile: true }])
    expect(w.activeProfile).toBe(1)
    expect(outputName(w)).toBe(NEVERSINK_OUTPUT)
    expect(w.edits).toHaveLength(2)
  })

  it('names the first profile after the copy it already saves', () => {
    const w = widget(w => { w.sourceName = 'NeverSink Strict.filter' })
    expect(w.profiles[0].name).toBe('NeverSink Strict')
    expect(outputName(w)).toBe('NeverSink Strict (woke).filter')
  })

  it('gives each new profile its own file and keeps the settings apart', () => {
    const w = widget(w => { w.neversink.on = true; w.edits = [edit(1)] })
    const copy = addProfile(w, 'Bossing', 'copy')
    const blank = addProfile(w, 'Leveling', 'blank')
    expect(profileFile(w, copy)).toBe('Bossing (woke).filter')
    expect(profileFile(w, blank)).toBe('Leveling (woke).filter')
    expect(copy.data?.edits).toHaveLength(1)
    expect(blank.data?.edits).toEqual([])
    // Same filter to start from.
    expect(blank.data?.neversink?.on).toBe(true)

    expect(switchProfileData(w, copy.id)).toBe(true)
    expect(w.activeProfile).toBe(copy.id)
    expect(outputName(w)).toBe('Bossing (woke).filter')
    w.edits = [...w.edits, edit(2)]
    w.neversink.level = 5

    switchProfileData(w, 1)
    expect(outputName(w)).toBe(NEVERSINK_OUTPUT)
    expect(w.edits.map(e => e.id)).toEqual([1])
    expect(w.neversink.level).toBe(1)

    switchProfileData(w, copy.id)
    expect(w.edits.map(e => e.id)).toEqual([1, 2])
    expect(w.neversink.level).toBe(5)
    // The one in use carries no stored copy; the others do.
    expect(w.profiles.find(p => p.id === copy.id)?.data).toBeUndefined()
    expect(w.profiles.find(p => p.id === 1)?.data?.edits).toHaveLength(1)
  })

  it('survives a save and load of the settings', () => {
    const w = widget(w => { w.sourceName = 'A.filter' })
    const p = addProfile(w, 'B', 'blank')
    switchProfileData(w, p.id)
    const back = JSON.parse(JSON.stringify(w)) as LootFilterWidget
    normalizeLootFilterWidget(back)
    expect(back.activeProfile).toBe(p.id)
    expect(back.profiles.map(x => x.name)).toEqual(['A', 'B'])
    switchProfileData(back, 1)
    expect(outputName(back)).toBe('A (woke).filter')
  })

  it('refuses names that clash with another profile or its file', () => {
    const w = widget(w => { w.neversink.on = true })
    addProfile(w, 'Bossing', 'blank')
    expect(profileNameProblem(w, 'bossing', null)).toMatch(/already/)
    // The first one saves to "NeverSink (woke).filter".
    expect(profileNameProblem(w, 'NeverSink', null)).toMatch(/already/)
    expect(profileNameProblem(w, '  ', null)).toBe('Give it a name')
    expect(profileNameProblem(w, 'Mapping', null)).toBeNull()
    expect(copyName(w, 'Bossing')).toBe('Bossing copy')
  })

  it('renaming the first profile moves it to a file named after it', () => {
    const w = widget(w => { w.neversink.on = true })
    expect(renameProfile(w, 1, 'Mapping')).toBe(true)
    expect(outputName(w)).toBe('Mapping (woke).filter')
    expect(w.profiles[0].legacyFile).toBeUndefined()
  })

  it('deletes only profiles not in use, never the last', () => {
    const w = widget()
    expect(deleteProfile(w, 1)).toBe(false)
    const p = addProfile(w, 'Other', 'blank')
    expect(deleteProfile(w, 1)).toBe(false)
    expect(deleteProfile(w, p.id)).toBe(true)
    expect(w.profiles).toHaveLength(1)
  })

  it('repairs a damaged list', () => {
    const w = widget()
    w.profiles = [null, { id: 'x' }, { id: 2, name: 'Two', data: { edits: [] } }, { id: 2, name: 'Dup' }] as never
    w.activeProfile = 9
    normalizeLootFilterWidget(w)
    expect(w.profiles.map(p => p.id)).toEqual([2])
    expect(w.activeProfile).toBe(2)
    expect(w.profiles[0].data).toBeUndefined()
  })
})

describe('loot filter profile history', () => {
  it('keeps the first profile on the old file and each other on its own', async () => {
    expect(historyDocFor(1)).toEqual(HISTORY_DOC)
    expect(historyDocFor(4).key).toBe('history-4')
    const docs = new Map<string, unknown>([['loot-filter/history', { timeline: { steps: [], at: 0 }, saves: [{ ts: 1, label: 'one', edits: [], moves: [] }] }]])
    const request = async (op: string, args: Record<string, unknown>) => {
      const key = `${String(args.collection)}/${String(args.key)}`
      if (op === 'doc-get-strict') return docs.get(key) ?? null
      if (op === 'doc-put') { docs.set(key, JSON.parse(JSON.stringify(args.value))); return true }
      throw new Error(op)
    }
    const legacy = { read: () => ({}), drop: vi.fn() }
    const h = useFilterHistory(legacy, request)
    await h.ready
    expect(h.saves.value).toHaveLength(1)
    await h.switchTo(historyDocFor(2))
    expect(h.saves.value).toEqual([])
    h.setSaves([{ ts: 2, label: 'two', edits: [], moves: [] }])
    await h.switchTo(historyDocFor(1))
    expect(h.saves.value.map(s => s.label)).toEqual(['one'])
    expect((docs.get('loot-filter/history-2') as { saves: unknown[] }).saves).toHaveLength(1)
  })
})
