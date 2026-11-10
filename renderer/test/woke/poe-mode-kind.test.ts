// PoE mode: each stat row's colour, section and tier, and "Fractured only"
// swapping a row to the fractured copy of its mod.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadGameData, parseItem } from '../helpers/game-data'
import { createPresets } from '@/web/price-check/filters/create-presets'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { poeLook, poeSection, poeTier, isTopTier, fracturedIds } from '@/web/woke/price-insight/poe-kind'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false }

const RING = `Item Class: Rings
Rarity: Rare
Doom Loop
Two-Stone Ring
--------
Requirements:
Level: 56
--------
Item Level: 84
--------
{ Implicit Modifier — Elemental, Fire, Cold, Resistance }
+14(12-16)% to Fire and Cold Resistances
--------
{ Fractured Prefix Modifier "Resplendent" (Tier: 3) — Damage, Physical, Attack }
Adds 7(6-9) to 13(12-15) Physical Damage to Attacks
{ Prefix Modifier "Rotund" (Tier: 1) — Life }
+64(60-69) to maximum Life
{ Master Crafted Suffix Modifier "of Craft" (Rank: 1) — Attack, Speed }
+30(26-30) to Dexterity
--------
Fractured Item`

function rows (text: string) {
  const item = parseItem(text)
  const presets = createPresets(item, OPTS)
  const preset = presets.presets.find(p => p.id === presets.active)!
  const stats = preset.stats.filter((s): s is StatFilter => !('group' in s && s.group))
  return { preset, stats }
}

describe('PoE mode stat rows', () => {
  beforeAll(loadGameData)

  it('gives each row its kind, section and tier', () => {
    const { stats } = rows(RING)
    const phys = stats.find(s => s.text.includes('Physical Damage to Attacks') && s.tag === 'explicit')!
    expect(poeLook(phys).kind).toBe('fractured')
    expect(poeSection(phys)).toBe('explicit')
    expect(poeTier(phys)).toBe('T3')

    const implicit = stats.find(s => s.tag === 'implicit')
    if (implicit) {
      expect(poeLook(implicit).kind).toBe('implicit')
      expect(poeSection(implicit)).toBe('implicit')
    }
    const pseudo = stats.find(s => s.tag === 'pseudo')!
    expect(poeLook(pseudo).kind).toBe('pseudo')
    // A total shows each of its mods' tiers, when every one has a tier.
    const tiers = pseudo.sources.map(s => s.modifier.info.tier)
    expect(poeTier(pseudo)).toBe(tiers.every(t => t != null) ? `T${tiers.join('/')}` : '')
    expect(isTopTier('T1')).toBe(true)
    expect(isTopTier('T1/1')).toBe(true)
    expect(isTopTier('T1/2')).toBe(false)
    expect(isTopTier('T10')).toBe(false)

    const crafted = stats.find(s => s.text.includes('Dexterity') && s.tag === 'crafted')
    if (crafted) expect(poeLook(crafted).kind).toBe('crafted')
  })

  it('"Fractured only" searches the fractured copy of the mod', () => {
    const { preset, stats } = rows(RING)
    const phys = stats.find(s => s.text.includes('Physical Damage to Attacks') && s.tag === 'explicit')!
    const ids = fracturedIds(phys)!
    expect(ids[0]).toMatch(/^fractured\./)
    for (const s of stats) s.disabled = true
    phys.disabled = false
    phys.tradeId = ids
    const req = JSON.stringify(createTradeRequest(preset.filters, preset.stats))
    expect(req).toContain(ids[0])
    expect(req).not.toContain('explicit.')
    // Rows without a fractured mod have no such switch.
    const life = stats.find(s => s.text.includes('maximum Life') && s.tag === 'explicit')
    if (life) expect(fracturedIds(life)).toBeUndefined()
  })
})
