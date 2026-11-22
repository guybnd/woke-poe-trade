// Templar Vaults: the poewiki reward table, its poe.ninja prices, the typical
// pick estimate, which vault each Nightmare map spawns, and the search cards.
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { nightmareMapsFor, rewardIcon, rewardPrice, topReward, typicalPick, vaultForFragment, vaultForNightmare, vaultsGiving } from '@/web/woke/vaults/vaults'
import type { Vault, VaultTable } from '@/web/woke/vaults/vaults'
import { vaultLookup } from '@/web/woke/search/lookups/vaults'
import { nightmareLookup } from '@/web/woke/search/lookups/nightmare'
import type { BossPrefs } from '@/web/woke/boss-runs/calc'
import type { PriceItem } from '@/web/woke/market/types'
import type { LookupContext } from '@/web/woke/search/lookups/types'
import { plain, readVault } from '../../scripts/build-vault-data.mjs'

const TABLE = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/data/league/vaults.json'), 'utf8')) as VaultTable
const vault = (name: string) => TABLE.vaults.find(v => v.name === name)!

// poe.ninja Covens, 2026-11-21 (gems: the level 1 row).
const PRICES: Record<string, number> = {
  'Stacked Deck': 3.61,
  'Orb of Intention': 1.46,
  'Orb of Remembrance': 93.36,
  'Orb of Unravelling': 10.23,
  'Reflecting Mist': 511.5,
  "Valdo's Puzzle Box": 186.9,
  'Greater Multistrike Support': 669.6,
  'Invention Support': 3,
  'Greater Spell Cascade Support': 15,
  'Cooldown Recovery Support': 80.8,
  'Nightmare Map': 70,
  'Fragment of Shape': 97.64,
  'Fragment of Knowledge': 96.64,
  'Fragment of Terror': 71.15,
  'Fragment of Emptiness': 59.44
}
const price = (name: string) => PRICES[name] ?? null

describe('vault table', () => {
  it('has the four vaults by area id, quadrant and bosses', () => {
    expect(TABLE.vaults.map(v => [v.id, v.name, v.quadrant])).toEqual([
      ['MapWorldsMemoryVault1', "Machinist's Vault", 'Northwest'],
      ['MapWorldsMemoryVault2', "Zealot's Vault", 'Northeast'],
      ['MapWorldsMemoryVault4', "Scholar's Vault", 'Southwest'],
      ['MapWorldsMemoryVault3', "Arkhon's Vault", 'Southeast']
    ])
    expect(vault("Zealot's Vault").bosses).toEqual(['The Shaper', 'Uber Elder', 'Venarius'])
  })

  it('prices every reward the wiki lists, or says why not', () => {
    for (const v of TABLE.vaults) {
      for (const r of v.rewards) expect(r.items?.length || r.note, `${v.name}: ${r.text}`).toBeTruthy()
    }
  })

  it('gives every reward but the uniques an icon item', () => {
    for (const v of TABLE.vaults) {
      for (const r of v.rewards) {
        if (r.kind === 'unique') expect(rewardIcon(r)).toBeNull()
        else expect(rewardIcon(r), `${v.name}: ${r.text}`).toBeTruthy()
      }
    }
    expect(rewardIcon(vault("Scholar's Vault").rewards.find(r => r.text === '1-5x Valuable currency')!)).toBe('Divine Orb')
  })

  it('marks the rewards the wiki calls rare', () => {
    const rare = TABLE.vaults.flatMap(v => v.rewards.filter(r => r.rare).map(r => r.text))
    expect(rare.sort()).toEqual(['Cooldown Recovery Support', 'Greater Multistrike Support', 'Greater Spell Cascade Support', 'Invention Support'])
  })
})

describe('prices and the typical pick', () => {
  it('averages one-of rewards and multiplies stacks', () => {
    const decks = vault("Machinist's Vault").rewards.find(r => r.text.includes('Stacked Deck'))!
    expect(rewardPrice(decks, price)).toBeCloseTo(15.5 * 3.61)
    const frags = vault("Arkhon's Vault").rewards.find(r => r.text === 'Uber Elder Fragments')!
    expect(rewardPrice(frags, price)).toBeCloseTo((97.64 + 96.64 + 71.15 + 59.44) / 4)
    expect(rewardPrice(vault("Zealot's Vault").rewards.find(r => r.kind === 'unique')!, price)).toBeNull()
  })

  it('is the expected best of four offers, rare ones a tenth as likely', () => {
    // Two rewards worth 10 and 0, equally likely: best of four is 10 unless all four are 0.
    const v: Vault = {
      id: 'x',
      name: 'X',
      quadrant: 'N',
      bosses: [],
      wiki: '',
      rewards: [
        { text: 'a', kind: 'c', items: [{ name: 'A' }] }, { text: 'b', kind: 'c' }
      ]
    }
    expect(typicalPick(v, n => n === 'A' ? 10 : null)).toBeCloseTo(10 * (1 - 0.5 ** 4))
    // A rare 100 next to a common 10: P(no rare in four) = (1/1.1)^4.
    const r: Vault = { ...v, rewards: [{ text: 'a', kind: 'c', items: [{ name: 'A' }] }, { text: 'r', kind: 'c', rare: true, items: [{ name: 'R' }] }] }
    const noRare = (1 / 1.1) ** 4
    expect(typicalPick(r, n => n === 'A' ? 10 : 100)).toBeCloseTo(10 * noRare + 100 * (1 - noRare))
    expect(typicalPick({ ...v, rewards: [{ text: 'b', kind: 'c' }] }, () => null)).toBeNull()
  })

  it('puts Reflecting Mist at the top of the Scholar’s Vault', () => {
    expect(topReward(vault("Scholar's Vault"), price)?.reward.text).toBe('Reflecting Mist')
    expect(typicalPick(vault("Scholar's Vault"), price)!).toBeGreaterThan(100)
  })
})

describe('which vault', () => {
  it('follows a fragment to its uber fight’s quadrant', () => {
    expect(vaultForFragment(TABLE, 'Reality Fragment')?.name).toBe("Arkhon's Vault")
    expect(vaultForFragment(TABLE, 'Decaying Fragment')?.name).toBe("Zealot's Vault")
    expect(vaultForFragment(TABLE, 'Blazing Fragment')?.name).toBe("Scholar's Vault")
    expect(vaultForFragment(TABLE, 'Lonely Fragment')?.name).toBe("Machinist's Vault")
  })

  it('gives each Nightmare map its boss’s quadrant vault, as seen in Client.txt', () => {
    // Seen: Fortress -> Zealot's, Abomination -> Arkhon's, Ziggurat -> Scholar's.
    expect(vaultForNightmare(TABLE, 'nightmare-fortress')?.name).toBe("Zealot's Vault")
    expect(vaultForNightmare(TABLE, 'nightmare-abomination')?.name).toBe("Arkhon's Vault")
    expect(vaultForNightmare(TABLE, 'nightmare-ziggurat')?.name).toBe("Scholar's Vault")
    expect(vaultForNightmare(TABLE, 'nightmare-citadel')?.name).toBe("Zealot's Vault")
    expect(vaultForNightmare(TABLE, 'nightmare-sanctuary')?.name).toBe("Machinist's Vault")
    expect(nightmareMapsFor(TABLE, vault("Zealot's Vault"))).toEqual(['Citadel', 'Fortress'])
  })

  it('knows Arkhon’s Vault gives Nightmare Maps', () => {
    expect(vaultsGiving(TABLE, 'Nightmare Map').map(v => v.name)).toEqual(["Arkhon's Vault"])
  })
})

const row = (type: string, name: string, chaos: number) => ({ type, name, variant: '', chaos }) as unknown as PriceItem
const ctx: LookupContext = { price, items: Object.entries(PRICES).map(([n, c]) => row('Currency', n, c)), tools: new Set(), divine: 223, now: 0, league: null }

describe('search', () => {
  const lookup = vaultLookup(TABLE)

  it('"vault" gives one card with all four vaults, best typical pick first', () => {
    for (const q of ['vault', 'vaul', 'Templar Vaults']) {
      const cards = lookup(q, ctx)
      expect(cards).toHaveLength(1)
      expect(cards[0].name).toBe('Templar Vaults')
    }
    const [card] = lookup('vault', ctx)
    const vaultSections = card.sections.filter(s => s.rows)
    expect(vaultSections).toHaveLength(4)
    expect(vaultSections[0].label).toMatch(/^Scholar's Vault · Southwest · ~\d+ c typical$/)
    expect(vaultSections.find(s => s.label!.startsWith("Zealot's"))!.rows![0].label).toBe('From The Shaper, Uber Elder, Venarius; Citadel and Fortress Nightmare maps')
  })

  it('"forbidden reliquary", the display case label, gives the vaults card', () => {
    for (const q of ['forbidden re', 'Forbidden Reliquary', 'reliquary', 'forbid']) {
      const cards = lookup(q, ctx)
      expect(cards).toHaveLength(1)
      expect(cards[0].name).toBe('Templar Vaults')
      expect(cards[0].sub).toMatch(/display case/)
    }
    expect(lookup('forb', ctx)).toEqual([])
    expect(lookup('forbidden flame', ctx)).toEqual([])
    expect(lookup('reliquary key', ctx)).toEqual([])
  })

  it('a vault name puts that vault first, with every reward', () => {
    const [card] = lookup('zealot', ctx)
    expect(card.name).toBe("Zealot's Vault")
    const first = card.sections[0]
    expect(first.label!.startsWith("Zealot's Vault · Northeast")).toBe(true)
    expect(first.rows).toHaveLength(1 + 5)
    expect(first.rows![1].label).toBe('Greater Multistrike Support · rare')
    expect(lookup("arkhon's vault", ctx)[0].sections[0].label!.startsWith("Arkhon's Vault")).toBe(true)
    expect(lookup('zea', ctx)).toEqual([])
    expect(vaultLookup(null)('vault', ctx)).toEqual([])
    // No spawn rate: it depends on how you play (Guy, 2026-11-21).
    expect(JSON.stringify(card)).not.toMatch(/\d+% of/)
  })

  it('names each Nightmare map’s vault without adding it to profit', () => {
    const items = [row('Map', 'Nightmare Map', 70), row('Fragment', 'Decaying Fragment', 79), row('Fragment', 'Synthesising Fragment', 13)]
    const c: LookupContext = { ...ctx, price: n => items.find(i => i.name === n)?.chaos ?? price(n), items }
    const [withVault] = nightmareLookup({} as BossPrefs, TABLE)('fortress', c)
    const [without] = nightmareLookup({} as BossPrefs)('fortress', c)
    const profit = (card: typeof withVault) => card.sections[0].rows!.find(r => r.label === 'Profit per map')!.chaos
    expect(profit(withVault)).toBe(profit(without))
    const vaultRow = withVault.sections[0].rows!.find(r => r.label.startsWith("Vault: Zealot's Vault"))!
    expect(vaultRow.chaos).toBeCloseTo(typicalPick(vault("Zealot's Vault"), c.price)!)
    expect(vaultRow.action).toEqual({ label: 'Vault rewards', search: "Zealot's" })
    const [overview] = nightmareLookup({} as BossPrefs, TABLE)('nightmare', c)
    const subs = overview.sections.find(s => s.table)!.table!.rows.map(r => (r.cells[0] as { sub: string }).sub)
    expect(subs.some(s => s.endsWith("Zealot's vault"))).toBe(true)
  })
})

describe('build-vault-data', () => {
  it('turns wiki markup into the plain reward text', () => {
    expect(plain('T3+ {{c|unique|[[Unique item|Unique]] armour/jewellery}} ')).toBe('T3+ Unique armour/jewellery')
    expect(plain('{{c|gem|[[Gem|Valuable gems]]}} (20/20, {{il|Empower Support|Empower}})')).toBe('Valuable gems (20/20, Empower)')
    expect(plain('11-20x {{il|Stacked Deck|Stacked Decks}}')).toBe('11-20x Stacked Decks')
  })

  it('reads a vault page and flags rewards it has no price for', () => {
    const text = '{{Query area infoboxes\n|where=areas.id="MapWorldsMemoryVault3"\n}}\n\'\'\'Arkhon\'s Vault\'\'\' is a ... that can appear after defeating a pinnacle boss in the southeast region ([[The Maven]], [[Sirus, Awakener of Worlds]]).\n\nIt contains multiple "Forbidden Reliquary" display cases which can grant one of the following rewards:\n\n* {{il|Valdo\'s Puzzle Box}}\n* [[Nightmare map]]s\n* Something new\n==Quests=='
    const { vault: v, missing } = readVault("Arkhon's Vault", text)
    expect(v.id).toBe('MapWorldsMemoryVault3')
    expect(v.quadrant).toBe('Southeast')
    expect(v.bosses).toEqual(['The Maven', 'Sirus, Awakener of Worlds'])
    expect(v.rewards.map((r: { text: string }) => r.text)).toEqual(["Valdo's Puzzle Box", 'Nightmare maps', 'Something new'])
    expect(missing).toEqual(['Something new'])
    expect(() => readVault('X', 'nothing here')).toThrow(/changed shape/)
  })
})
