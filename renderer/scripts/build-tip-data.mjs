// Builds the item tooltip data in public/data/tips (English only). Run it once
// a league, or after a patch adds items:
//
//   npm run tip-data -- Allflame
//
// Sources:
//   poe.ninja       unique mods, flavour text and Foulborn variants, from the
//                   league given, then Standard for uniques it has no listing of
//   RePoE           gem stats per level; currency, card, scarab and essence
//                   text; base item stats (repoe-fork.github.io)
//   Path of Building  tattoo effects, which RePoE leaves blank
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RENDERER = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(RENDERER, 'public/data/tips')
const LEAGUE = process.argv[2]
if (!LEAGUE) throw new Error('Usage: npm run tip-data -- <league name>, e.g. Allflame')

const UA = 'woke-poe-trade tip-data'
const TATTOOS = 'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/dev/src/Data/TattooPassives.lua'
const UNIQUE_TYPES = ['UniqueArmour', 'UniqueWeapon', 'UniqueAccessory', 'UniqueFlask', 'UniqueJewel', 'UniqueMap', 'UniqueRelic', 'UniqueTincture']
// Attribute and internal tags the game doesn't list on a gem.
const HIDDEN_TAGS = new Set(['strength', 'dexterity', 'intelligence', 'default', 'exceptional', 'grants_active_skill', 'low_max_level', 'support_gem', 'active_skill'])

async function getJson (url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} from ${url}`)
  return res.json()
}

// RePoE's "[Keyword|Shown text]" and "[Keyword]" links.
const unlink = (s) => s.replace(/\[([^\]|]*\|)?([^\]]*)\]/g, '$2')

function appItems () {
  return readFileSync(join(RENDERER, 'public/data/en/items.ndjson'), 'utf8').trim().split('\n').map(l => JSON.parse(l))
}

async function ninjaUniques (league, byName = new Map()) {
  const seenBefore = new Set(byName.keys())
  for (const type of UNIQUE_TYPES) {
    const { lines } = await getJson(`https://poe.ninja/poe1/api/economy/stash/current/item/overview?league=${encodeURIComponent(league)}&type=${type}`)
    for (const l of lines) {
      if (seenBefore.has(l.name)) continue
      const row = {
        n: l.variant || undefined,
        l: l.levelRequired || undefined,
        i: (l.implicitModifiers ?? []).map(m => m.text),
        e: (l.explicitModifiers ?? []).map(m => m.text),
        m: (l.mutatedModifiers ?? []).map(m => m.text)
      }
      const entry = byName.get(l.name)
      if (!entry) byName.set(l.name, { b: l.baseType, f: l.flavourText || undefined, v: [row] })
      else if (!entry.v.some(r => r.n === row.n)) entry.v.push(row)
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  return byName
}

function compactUnique (entry) {
  const v = entry.v.map(r => ({
    ...(r.n ? { n: r.n } : {}),
    ...(r.l ? { l: r.l } : {}),
    ...(r.i.length ? { i: r.i } : {}),
    ...(r.e.length ? { e: r.e } : {}),
    ...(r.m.length ? { m: r.m } : {})
  }))
  return { b: entry.b, ...(entry.f ? { f: entry.f } : {}), v }
}

function compactGem (gem) {
  const perLevel = gem.per_level ?? {}
  const lastLevel = (gem.base_item?.max_level ?? 20) + 1
  const lines = (o) => Object.values(o?.stat_text ?? {}).filter(Boolean).map(unlink)
  const lv = {}
  for (const key of Object.keys(perLevel)) {
    if (Number(key) > lastLevel) continue
    const p = perLevel[key]
    const req = p.stat_requirements ?? {}
    const cost = Object.entries(p.costs ?? {}).map(([k, n]) => `${n} ${k}`).join(', ')
    const attrs = { ...(req.str ? { s: req.str } : {}), ...(req.dex ? { d: req.dex } : {}), ...(req.int ? { i: req.int } : {}) }
    lv[key] = {
      ...(p.required_level ? { r: p.required_level } : {}),
      ...(Object.keys(attrs).length ? { a: attrs } : {}),
      ...(cost ? { c: cost } : {}),
      ...(lines(p).length ? { x: lines(p) } : {})
    }
  }
  const stat = gem.static ?? {}
  // Only "#% increased" style lines have a known scale (1000 is 1% a quality
  // point). Others use the stat's own unit, such as milliseconds or tenths.
  const quality = (stat.quality_stats ?? []).filter(q => q.stat).map(q => ({
    t: unlink(q.stat).replace(/\{[^}]+\}/g, () => '#'),
    v: Object.values(q.stats ?? {})
  })).filter(q => q.v.length === 1 && /^[^#]*#% (increased|reduced|more|less) [^#]*$/.test(q.t))
  const description = gem.active_skill?.description
  return {
    c: gem.color || 'w',
    ...(gem.is_support ? { s: 1 } : {}),
    t: (gem.tags ?? []).filter(t => !HIDDEN_TAGS.has(t)).map(t => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
    ...(description ? { d: unlink(description) } : {}),
    ...(stat.cost_multiplier ? { cm: stat.cost_multiplier } : {}),
    ...(gem.cast_time ? { ct: gem.cast_time } : {}),
    ...(lines(stat).length ? { st: lines(stat) } : {}),
    ...(quality.length ? { q: quality } : {}),
    lv
  }
}

// Path of Building's generated tattoo table: effect lines by tattoo name.
async function tattooEffects () {
  const res = await fetch(TATTOOS, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} from ${TATTOOS}`)
  const lua = await res.text()
  const effects = new Map()
  for (const m of lua.matchAll(/\["dn"\] = "([^"]+)",[\s\S]*?\["sd"\] = \{([\s\S]*?)\n\t+\}/g)) {
    const lines = [...m[2].matchAll(/\] = "((?:[^"\\]|\\.)*)"/g)].map(l => l[1].replace(/\\(.)/g, '$1'))
    if (lines.length) effects.set(m[1], lines.join('\n'))
  }
  return effects
}

async function main () {
  const items = appItems()
  const repoeGems = await getJson('https://repoe-fork.github.io/gems.min.json')
  const repoeBases = await getJson('https://repoe-fork.github.io/base_items.min.json')
  const byBaseName = new Map()
  for (const b of Object.values(repoeBases)) {
    if (b.name && b.release_state !== 'unreleased' && !byBaseName.has(b.name)) byBaseName.set(b.name, b)
  }

  // ---- gems ----
  const gemNames = new Set(items.filter(i => i.namespace === 'GEM').map(i => i.name))
  const gems = {}
  for (const g of Object.values(repoeGems)) {
    const name = g.display_name
    if (name && gemNames.has(name) && !gems[name]) gems[name] = compactGem(g)
  }

  // ---- currency, cards and everything else that stacks ----
  const stackables = {}
  const bases = {}
  const effects = await tattooEffects()
  for (const i of items.filter(i => i.namespace === 'ITEM' || i.namespace === 'DIVINATION_CARD')) {
    const b = byBaseName.get(i.name)
    if (!b) continue
    const p = b.properties ?? {}
    if (p.description !== undefined || p.directions !== undefined || p.stack_size) {
      stackables[i.name] = {
        ...(p.description || effects.has(i.name) ? { d: unlink(p.description || effects.get(i.name)) } : {}),
        ...(p.directions ? { u: unlink(p.directions) } : {}),
        ...(p.stack_size ? { n: p.stack_size } : {})
      }
    } else {
      const { armour, evasion, energy_shield: es, ward } = p
      const req = b.requirements ?? {}
      bases[i.name] = {
        ...(armour ? { ar: [armour.min, armour.max] } : {}),
        ...(evasion ? { ev: [evasion.min, evasion.max] } : {}),
        ...(es ? { es: [es.min, es.max] } : {}),
        ...(ward ? { wd: [ward.min, ward.max] } : {}),
        ...(p.physical_damage_max ? { ph: [p.physical_damage_min, p.physical_damage_max] } : {}),
        ...(p.attack_time ? { at: p.attack_time } : {}),
        ...(p.critical_strike_chance ? { cr: p.critical_strike_chance } : {}),
        ...(req.level ? { l: req.level } : {}),
        ...(req.strength ? { s: req.strength } : {}),
        ...(req.dexterity ? { d: req.dexterity } : {}),
        ...(req.intelligence ? { i: req.intelligence } : {})
      }
    }
  }

  // Currency RePoE has no text for yet, from poedb by hand (tip-items-extra.json).
  const extra = JSON.parse(readFileSync(join(RENDERER, 'scripts/tip-items-extra.json'), 'utf8'))
  for (const [name, text] of Object.entries(extra)) stackables[name] ??= text

  // ---- uniques ----
  const ninja = await ninjaUniques(LEAGUE)
  if (LEAGUE !== 'Standard') await ninjaUniques('Standard', ninja)
  const appUniques = new Set(items.filter(i => i.namespace === 'UNIQUE').map(i => i.name))

  const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a < b ? -1 : 1))
  const uniques = {}
  for (const [name, entry] of ninja) uniques[name] = compactUnique(entry)

  mkdirSync(OUT, { recursive: true })
  const write = (file, data) => {
    const text = JSON.stringify(sorted(data))
    writeFileSync(join(OUT, file), text)
    console.log(`${file}: ${Object.keys(data).length} entries, ${(text.length / 1024).toFixed(0)} KB`)
  }
  write('uniques.json', uniques)
  write('gems.json', gems)
  write('items.json', stackables)
  write('bases.json', bases)
  console.log(`Uniques in the app with no text: ${[...appUniques].filter(n => !uniques[n]).join(', ') || 'none'}`)
  console.log(`Currency in the app with no text: ${items.filter(i => i.namespace === 'ITEM' && !i.craftable && i.name !== 'Viscera' && !stackables[i.name] && !bases[i.name]).map(i => i.name).join(', ') || 'none'}`)
  console.log(`Gems in the app with no text: ${[...gemNames].filter(n => !gems[n]).join(', ') || 'none'}`)
}

await main()
