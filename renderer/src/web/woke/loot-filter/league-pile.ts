// The League items page's sample pile (Guy's League A, 2026-11-28): logbooks,
// contracts and blueprints of every item level band, enchanted ones,
// Chronicles, Viscera, Reliquary keys, Ultimatums, Sanctum research, charts
// and warrants. Each is an ItemFacts the matcher runs through the filter.
import type { FilterRarity, ItemFacts } from './item-facts'
import type { MapDrop } from './map-pile'

const AREA = 83
const JOBS = ['Bunker', 'Laboratory', 'Mansion', 'Prohibited Library', 'Records Office', 'Repository', "Smuggler's Den", 'Tunnels', 'Underbelly']
const VISCERA = ["Maven's Orrery", "Elder's Head", "Baran's Head", "Hydra's Head", 'Arachnid Leg', 'Bear Head', 'Blazing Skull']
const KEYS = ['Ancient Reliquary Key', 'Cosmic Reliquary Key', 'Visceral Reliquary Key', 'Shiny Reliquary Key']
const ILVLS = [84, 83, 81, 75, 68]

function rng (s: number) {
  let x = (s * 69621 + 11) % 2147483647
  return () => { x = (x * 69621) % 2147483647; return (x - 1) / 2147483646 }
}
const one = <T>(list: readonly T[], r: () => number): T => list[Math.floor(r() * list.length)]

function facts (base: string, cls: string, rarity: FilterRarity, itemLevel: number, more: Partial<ItemFacts> = {}): ItemFacts {
  return { name: base, itemClass: cls, baseType: base, rarity, itemLevel, identified: false, corrupted: false, influences: [], explicitModNames: [], areaLevel: AREA, ...more }
}
const band = (n: number) => n >= 83 ? 'item level 83+' : 'item level under 83'
const rar = (r: () => number): FilterRarity => one(['Normal', 'Magic', 'Rare'] as FilterRarity[], r)

type Make = (r: () => number) => Omit<MapDrop, 'id'>
const KINDS: Array<{ id: string, w: number, make: Make }> = [
  { id: 'logbook', w: 5, make: r => { const n = one(ILVLS, r); return { key: `lb-${n}`, label: 'Expedition Logbook', kind: `ilvl ${n}`, tip: 'Expedition Logbook', facts: facts('Expedition Logbook', 'Expedition Logbooks', rar(r), n), priced: `Logbook, ${band(n)}` } } },
  { id: 'contract', w: 5, make: r => { const b = `Contract: ${one(JOBS, r)}`; const n = one(ILVLS, r); return { key: `ct-${b}-${n}`, label: b, kind: `ilvl ${n}`, tip: b, facts: facts(b, 'Contracts', rar(r), n), priced: `Contract, ${band(n)}` } } },
  { id: 'blueprint', w: 3, make: r => { const b = `Blueprint: ${one(JOBS, r)}`; const n = one(ILVLS, r); return { key: `bp-${b}-${n}`, label: b, kind: `ilvl ${n}`, tip: b, facts: facts(b, 'Blueprints', rar(r), n), priced: `Blueprint, ${band(n)}` } } },
  { id: 'enchanted', w: 1, make: r => { const bp = r() < 0.5; const b = `${bp ? 'Blueprint' : 'Contract'}: ${one(JOBS, r)}`; return { key: `en-${b}`, label: b, kind: 'Enchanted', tip: b, facts: facts(b, bp ? 'Blueprints' : 'Contracts', 'Rare', 83, { anyEnchantment: true }), priced: `${bp ? 'Blueprint' : 'Contract'}, enchanted` } } },
  { id: 'chronicle', w: 2, make: () => ({ key: 'chron', label: 'Chronicle of Atzoatl', kind: null, tip: 'Chronicle of Atzoatl', facts: facts('Chronicle of Atzoatl', 'Itemised Mirror of Delirium', 'Normal', 83), priced: 'Chronicle of Atzoatl' }) },
  { id: 'viscera', w: 4, make: r => { const b = one(VISCERA, r); return { key: `vi-${b}`, label: b, kind: null, tip: b, facts: facts(b, 'Viscera', 'Normal', 83), priced: b } } },
  { id: 'key', w: 2, make: r => { const b = one(KEYS, r); return { key: `key-${b}`, label: b, kind: null, tip: b, facts: facts(b, 'Vault Keys', 'Normal', 83), priced: b } } },
  { id: 'ultimatum', w: 2, make: () => ({ key: 'ult', label: 'Inscribed Ultimatum', kind: null, tip: 'Inscribed Ultimatum', facts: facts('Inscribed Ultimatum', 'Inscribed Ultimatum', 'Normal', 83), priced: 'Inscribed Ultimatum' }) },
  { id: 'sanctum', w: 2, make: r => { const n = one(ILVLS, r); return { key: `sa-${n}`, label: 'Forbidden Tome', kind: `ilvl ${n}`, tip: 'Forbidden Tome', facts: facts('Forbidden Tome', 'Sanctum Research', 'Normal', n), priced: `Sanctum research, ${band(n)}` } } },
  { id: 'chart', w: 1, make: () => ({ key: 'chart', label: 'Chart', kind: null, tip: 'Chart', facts: facts('Chart', 'Chart', 'Normal', 83), priced: 'Chart' }) },
  { id: 'warrant', w: 1, make: () => ({ key: 'merc', label: 'Mercenary Warrant', kind: null, tip: 'Mercenary Warrant', facts: facts('Mercenary Warrant', 'Mercenary Warrant', 'Normal', 83), priced: 'Mercenary Warrant' }) }
]
const ALWAYS = ['logbook', 'contract', 'blueprint', 'enchanted', 'chronicle', 'viscera', 'key', 'ultimatum', 'sanctum']

export function leaguePile (seed: number, count = 22): MapDrop[] {
  const r = rng(seed)
  const kinds = ALWAYS.map(id => KINDS.find(k => k.id === id)!)
  const total = KINDS.reduce((a, k) => a + k.w, 0)
  while (kinds.length < count) {
    let x = r() * total
    kinds.push(KINDS.find(k => (x -= k.w) <= 0) ?? KINDS[0])
  }
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]]
  }
  return kinds.map((k, id) => ({ id, ...k.make(r) }))
}
