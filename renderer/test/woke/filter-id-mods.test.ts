// Identified gear in Rare weights (id-mods.ts): the price check's valuable
// mods score identified rares and magic gear by tier, and the compiled rules
// (which can only count mod names) give each item the step its score says.
import { describe, it, expect, beforeAll } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { WEIGHT_TYPE, applyWeights, defaultWeights, filterBases, stepOf } from '@/web/woke/loot-filter/weights'
import type { BaseRow, WeightSettings } from '@/web/woke/loot-filter/weights'
import { DEFAULT_SEED, MAX_MODS, idGroups, itemMods, minimalCounts, modKey, seedIndex } from '@/web/woke/loot-filter/id-mods'
import type { AffixTable, IdGroup } from '@/web/woke/loot-filter/id-mods'
import fs from 'node:fs'
import path from 'node:path'
import { neverSink } from '../helpers/neversink'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData, 60000)

const SEMI = neverSink('2-SEMI-STRICT')
const TABLE = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/data/affix-tiers.json'), 'utf8')) as AffixTable

function rng (seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
}
const pts = (m: number) => 10 * Math.log2(m)

function on (change: (w: WeightSettings) => void = () => {}): WeightSettings {
  const w = defaultWeights()
  w.on = true
  change(w)
  return w
}

describe('identified mods', () => {
  it('reads a mod by its first line and keeps minion lines apart', () => {
    expect(seedIndex('#% increased Movement Speed', DEFAULT_SEED)).toBe(2)
    expect(seedIndex('Minions have #% increased Movement Speed', DEFAULT_SEED)).toBe(-1)
    expect(seedIndex('+# to Armour\n+# to maximum Life', DEFAULT_SEED)).toBe(-1)
    expect(modKey('+# to maximum Life', 1, DEFAULT_SEED)).toBe('ig1')
    expect(modKey('+#% to Fire Resistance', 2, DEFAULT_SEED)).toBe('ig3')
    expect(modKey('+#% to Fire Resistance', 3, DEFAULT_SEED)).toBeNull()
    expect(modKey('+#% to Fire Resistance', 4, DEFAULT_SEED)).toBeNull()
  })

  it('the fewest counts reach the points exactly', () => {
    const r = rng(5)
    for (let round = 0; round < 40; round++) {
      const k = 1 + Math.floor(r() * 5)
      const levels = Array.from({ length: k }, () => 1 + Math.round(r() * 20)).sort((a, b) => b - a).filter((v, i, a) => a.indexOf(v) === i)
      const max = r() < 0.5 ? 2 : 6
      const need = Math.round(r() * 60)
      const mins = minimalCounts(levels, need, max)
      // Every way an item's mods can sit across the levels.
      for (let n = 0; n < 200; n++) {
        const mods = Array.from({ length: Math.floor(r() * (max + 1)) }, () => Math.floor(r() * (levels.length + 1)))
        const score = mods.reduce((s, j) => s + (levels[j] ?? 0), 0)
        const nested = levels.map((_, j) => mods.filter(x => x <= j).length)
        const meets = mins.some(m => m.every((x, j) => nested[j] >= x))
        expect(meets, `${JSON.stringify({ levels, need, mods })}`).toBe(score >= need - 1e-6)
      }
    }
  })

  it('every gear class has its top mods listed', () => {
    const groups = idGroups(TABLE, DEFAULT_SEED, defaultWeights().mult)
    const of = (cls: string) => groups.find(g => g.classes.includes(cls))!
    const top = (cls: string) => of(cls).levels[0].names
    expect(top('Boots')).toContain("Hellion's")
    expect(of('Two Hand Swords').levels.flatMap(l => l.names)).toContain('Merciless')
    const all = (g: IdGroup) => g.levels.flatMap(l => l.names)
    // No name inside another name worth less (the game matches part of a name).
    for (const g of groups) {
      for (const n of all(g)) {
        for (const cls of g.classes) {
          for (const [o] of TABLE.classes[cls]) {
            if (o === n || !o.includes(n)) continue
            const ptsOf = (x: string) => g.levels.find(l => l.names.includes(x))?.pts ?? 0
            expect(ptsOf(o), `${n} in ${o} on ${cls}`).toBeGreaterThanOrEqual(ptsOf(n))
          }
        }
      }
    }
  })

  it('each identified rare and magic item lands on its score\'s step', () => {
    const r = rng(41)
    for (const need of [1, 4, 16]) {
      const doc = parseFilter(SEMI)
      const w = on(x => { x.need = need })
      const groups = idGroups(TABLE, DEFAULT_SEED, w.mult)
      const bases = filterBases(doc).filter((b): b is BaseRow & { cls: string } => !!b.cls && !!TABLE.classes[b.cls])
      const compiled = applyWeights(doc, w, bases, groups)!
      const idRules = compiled.blocks.filter(b => /identified/.test(b.comment ?? ''))
      console.log(need, groups.length, idRules.length, idRules.reduce((s, b) => s + b.conditions.reduce((k, c) => k + c.values.join('" "').length + 20, 60), 0))
      expect(idRules.length).toBeLessThan(2000)
      for (let n = 0; n < 800; n++) {
        const row = bases[Math.floor(r() * bases.length)]
        const rarity = r() < 0.7 ? 'Rare' : 'Magic'
        const g = groups.find(x => x.classes.includes(row.cls))!
        const rows = TABLE.classes[row.cls]
        // Names from the group that roll on this class.
        const listed = g.levels.flatMap(l => l.names).filter(x => rows.some(y => y[0] === x))
        // Mostly listed mods, so every step gets items.
        const names = [...new Set(Array.from({ length: 1 + Math.floor(r() * MAX_MODS[rarity]) }, () => r() < 0.6 ? listed[Math.floor(r() * listed.length)] : rows[Math.floor(r() * rows.length)][0]))]
        const facts = { name: row.name, baseType: row.name, itemClass: row.cls, rarity, itemLevel: 84, areaLevel: 83, width: row.width, height: row.height, identified: true, corrupted: false, corruptedMods: 0, mirrored: false, influences: [], socketGroups: [], quality: 0, memoryStrands: 0, fractured: false, synthesised: false, fated: false, anyEnchantment: false, crucibleTree: false, exarchTier: 0, eaterTier: 0, explicitModNames: names } as unknown as ItemFacts
        // Its score as the card counts it, the names the rules can't tell apart left out.
        const counted = itemMods(TABLE, row.cls, names, DEFAULT_SEED, w.mult).filter(x => listed.includes(x.name))
        const score = pts(w.mult[rarity === 'Rare' ? 'idr' : 'idm']) + counted.reduce((s, x) => s + x.pts, 0)
        const want = stepOf(Math.pow(2, score / 10) * (1 + 1e-9), w.need, w.loud)
        const res = matchItem(doc, facts)
        // Magic that only its rarity would show is left to its base.
        if (rarity === 'Magic' && (want === 0 || !counted.some(x => x.pts > 0))) continue
        expect(res.final?.block.type, `${row.cls} ${names.join(', ')}`).toBe(WEIGHT_TYPE)
        expect(res.final?.block.tier, `${rarity} ${row.cls} ${names.join(', ')} ${score} ${res.final?.block.comment} ${JSON.stringify(res.final?.block.conditions.filter(c => c.key === 'HasExplicitMod'))}`).toBe(`s${want}`)
      }
      // The game takes the file.
      const problems = validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)
      expect(problems).toEqual([])
    }
  })

  it('an identified item with a mark that counts scores by it, not by its mods', () => {
    const doc = parseFilter(SEMI)
    const w = on()
    const groups = idGroups(TABLE, DEFAULT_SEED, w.mult)
    const bases = filterBases(doc)
    applyWeights(doc, w, bases, groups)
    const row = bases.find(b => b.cls === 'Body Armours' && b.rank === 'r0' && b.width === 2 && !b.old)!
    const facts = (extra: object) => ({ name: row.name, baseType: row.name, itemClass: 'Body Armours', rarity: 'Rare', itemLevel: 84, areaLevel: 83, width: row.width, height: row.height, identified: true, corrupted: false, corruptedMods: 0, mirrored: false, influences: [], socketGroups: [], quality: 0, memoryStrands: 0, fractured: false, synthesised: false, fated: false, anyEnchantment: false, crucibleTree: false, exarchTier: 0, eaterTier: 0, explicitModNames: ['of the Genius'], ...extra }) as unknown as ItemFacts
    // Plain mods, no mark: hidden.
    expect(matchItem(doc, facts({})).visibility).toBe('Hide')
    // A 6-link (×32) shows.
    const six = matchItem(doc, facts({ socketGroups: ['RRRRRR'] }))
    expect(six.final?.block.type).toBe(WEIGHT_TYPE)
    expect(six.visibility).toBe('Show')
    // Each mark scores it as an unidentified tier 1 one would.
    const unid = (extra: object) => facts({ identified: false, unidentifiedItemTier: 1, explicitModNames: [], ...extra })
    for (const extra of [{ socketGroups: ['RRRRRR'] }, { socketGroups: ['RRRRR'] }, { fractured: true }, { influences: ['shaper'] }, { quality: 28 }, { synthesised: true }]) {
      const a = matchItem(doc, facts(extra))
      const b = matchItem(doc, unid(extra))
      expect(a.visibility, JSON.stringify(extra)).toBe(b.visibility)
      expect(a.final?.block.tier, JSON.stringify(extra)).toBe(b.final?.block.tier)
    }
  })

  it('magic its rarity alone would show is left to its base', () => {
    const doc = parseFilter(SEMI)
    const w = on(x => { x.need = 0.5 })
    const compiled = applyWeights(doc, w, filterBases(doc), idGroups(TABLE, DEFAULT_SEED, w.mult))!
    for (const b of compiled.blocks.filter(x => /identified magic/.test(x.comment ?? ''))) {
      expect(b.conditions.some(c => c.key === 'HasExplicitMod')).toBe(true)
    }
  })

  it('without the mod table identified rares are left to NeverSink', () => {
    const doc = parseFilter(SEMI)
    const w = on()
    applyWeights(doc, w)
    const facts = { name: 'Two-Toned Boots', baseType: 'Two-Toned Boots', itemClass: 'Boots', rarity: 'Rare', itemLevel: 84, areaLevel: 83, width: 2, height: 2, identified: true, corrupted: false, corruptedMods: 0, mirrored: false, influences: [], socketGroups: [], explicitModNames: [] } as unknown as ItemFacts
    expect(matchItem(doc, facts).final?.block.type).not.toBe(WEIGHT_TYPE)
  })
})
