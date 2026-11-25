// The tooltip's "You have N" counts from a stash read (tooltip audit pick I9).
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/web/Config', () => ({ AppConfig: () => ({ leagueId: 'Test' }) }))
vi.mock('@/web/woke/shared/host', () => ({ hostRequest: async () => null }))

describe('held counts', () => {
  it('adds stacks across tabs, uniques by name', async () => {
    const { countHeld } = await import('@/web/woke/ui/tooltip/held')
    const counts = countHeld({
      tabs: [
        { items: [{ name: '', typeLine: 'Orb of Annulment', frame: 5, stack: 20 }, { name: 'Mageblood', typeLine: 'Heavy Belt', frame: 3, stack: 1 }] },
        { items: [{ name: '', typeLine: 'Orb of Annulment', frame: 5, stack: 14 }] }
      ]
    })
    expect(counts.get('Orb of Annulment')).toBe(34)
    expect(counts.get('Mageblood')).toBe(1)
    expect(counts.get('Heavy Belt')).toBeUndefined()
  })
  it('counts magic, superior and Blighted maps by their base', async () => {
    const { countHeld } = await import('@/web/woke/ui/tooltip/held')
    const counts = countHeld({
      tabs: [{
        items: [
          { name: '', typeLine: 'Superior Strand Map', baseType: 'Strand Map', frame: 0, stack: 1 },
          { name: '', typeLine: 'Fecund Strand Map of Bloodlines', baseType: 'Strand Map', frame: 1, stack: 1 },
          { name: '', typeLine: 'Blighted Strand Map', baseType: 'Strand Map', frame: 0, stack: 1 }
        ]
      }]
    })
    expect(counts.get('Strand Map')).toBe(2)
    expect(counts.get('Blighted Strand Map')).toBe(1)
  })
  it('has nothing without a read', async () => {
    const { heldCount } = await import('@/web/woke/ui/tooltip/held')
    expect(await heldCount('Orb of Annulment')).toBeNull()
  })
})
