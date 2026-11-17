// PoB's item text (an item's body in build XML, or Ctrl+C on an item in PoB)
// read into a PobItem. Shared: main reads build files with it, the renderer
// reads PoB item text pasted into search.

export type PobRarity = 'NORMAL' | 'MAGIC' | 'RARE' | 'UNIQUE' | 'RELIC' | ''

export interface PobItem {
  rarity: PobRarity
  // Unique or rare name; the full name for magic and normal items.
  name: string
  // Base type when PoB lists it on its own line (uniques and rares).
  base: string
  // As PoB writes it, e.g. "R-G-B B".
  sockets: string
  // A jewel's radius as PoB writes it ("Large", "Variable"), if it has one.
  radius?: string
  // A cluster jewel's small-passive skill id and node count, as PoB writes them.
  clusterSkill?: string
  clusterNodeCount?: number
  implicits: string[]
  mods: string[]
  // Same length as mods when any mod is crafted or fractured.
  modKinds?: PobModKind[]
  // Same length as implicits when PoB marks any as crafted, meaning an enchant.
  implicitKinds?: PobModKind[]
  quality?: number
  armour?: number
  evasion?: number
  energyShield?: number
  ward?: number
  itemLevel?: number
  levelReq?: number
  // Catalyst quality (rings, amulets, belts): raises one kind of mod's values.
  catalystQuality?: number
  corrupted?: boolean
  mirrored?: boolean
  // Shaper, Elder, Crusader, Hunter, Redeemer, Warlord
  influences?: string[]
}

export type PobModKind = '' | 'crafted' | 'fractured'

export function decodeEntities (s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
}

// PoB item text: "Rarity: X", name line(s), then "Key: value" lines, then
// "Implicits: N" followed by N implicit lines and the explicit mods.
// Mod lines may start with {tags}; {variant:1,2} limits a line to variants.
// A meta line is "Key: value" or a flag on its own: a base can start with a
// flag's word ("Mirrored Spiked Shield").
const ITEM_META = /^(?:(?:Unique ID|Item Level|Quality(?: \([^)]*\))?|Sockets|LevelReq|Selected Variant|Selected Alt Variant|Variant|Has Alt Variant|League|Source|Upgrade|Radius|Limited to|Crafted|Prefix|Suffix|Catalyst|CatalystQuality|Cluster Jewel Skill|Cluster Jewel Node Count|Armour|Evasion(?: Rating)?|Energy Shield|Ward|Talisman Tier|Item Class|Note)\s*:|(?:Shaper|Elder|Crusader|Hunter|Redeemer|Warlord|Searing Exarch|Eater of Worlds|Synthesised|Fractured) Item$|(?:Corrupted|Mirrored|Split|Unreleased|Foulborn)$|Foil Unique\b|Requires\b)/

// Lines after the implicits that are the item's numbers or looks, not mods.
const NOT_A_MOD = /^(?:(?:Quality(?: \([^)]*\))?|Armour|Evasion(?: Rating)?|Energy Shield|Ward)\s*:|Foil Unique\b)/

const ITEM_NUMBERS: Array<[RegExp, 'quality' | 'armour' | 'evasion' | 'energyShield' | 'ward' | 'itemLevel' | 'levelReq' | 'catalystQuality']> = [
  [/^Quality:\s*\+?(\d+)/, 'quality'],
  [/^CatalystQuality:\s*(\d+)/, 'catalystQuality'],
  [/^Armour:\s*(\d+)/, 'armour'],
  [/^Evasion:\s*(\d+)/, 'evasion'],
  [/^Energy Shield:\s*(\d+)/, 'energyShield'],
  [/^Ward:\s*(\d+)/, 'ward'],
  [/^Item Level:\s*(\d+)/, 'itemLevel'],
  [/^LevelReq:\s*(\d+)/, 'levelReq']
]

const ANTONYM: Record<string, string> = { increased: 'reduced', reduced: 'increased', more: 'less', less: 'more' }

// "+(41-55) to Life" at range 0.5 is "+48 to Life", as PoB shows it. Range 1
// is the top of the roll.
function applyRange (line: string, range: number): string {
  return line.replace(/([+-]?)\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)/g, (_, sign: string, lo: string, hi: string) => {
    const min = Number(lo)
    const max = Number(hi)
    const roll = min + range * (max - min)
    const size = /\./.test(lo + hi) ? 100 : 1
    // Rounds away from zero both ways, as PoB does.
    const value = (sign === '-' ? -1 : 1) * Math.sign(roll) * Math.round(Math.abs(roll) * size) / size
    return sign === '+' && value > 0 ? `+${value}` : String(value)
  }).replace(/-(\d+(?:\.\d+)?%) (increased|reduced|more|less)\b/, (_, num: string, word: string) => `${num} ${ANTONYM[word]}`)
}

// `ranges`: PoB's <ModRange> elements, by the mod line's place in the item.
export function parseItemText (text: string, ranges?: Map<number, number>): PobItem {
  const lines = decodeEntities(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const item: PobItem = { rarity: '', name: '', base: '', sockets: '', implicits: [], mods: [] }
  let i = 0
  const r = /^Rarity:\s*(\w+)/i.exec(lines[0] ?? '')
  if (r) { item.rarity = r[1].toUpperCase() as PobRarity; i = 1 }
  item.name = lines[i++] ?? ''
  if ((item.rarity === 'UNIQUE' || item.rarity === 'RARE' || item.rarity === 'RELIC') && lines[i] && !ITEM_META.test(lines[i]) && !/^Implicits:/.test(lines[i])) {
    item.base = lines[i++]
  }
  // "Selected Variant", and "Selected Alt Variant [Two…]" on jewels with several
  // picks (Watcher's Eye): a mod shows when any of them lists it.
  const variants: number[] = []
  let implicitsLeft = -1
  let modLine = 0
  const kinds: PobModKind[] = []
  const implicitKinds: PobModKind[] = []
  for (; i < lines.length; i++) {
    const line = lines[i]
    const sel = /^Selected (?:Alt )?Variant(?: \w+)?:\s*(\d+)/.exec(line)
    if (sel) { variants.push(Number(sel[1])); continue }
    const cskill = /^Cluster Jewel Skill:\s*(\S+)/.exec(line)
    if (cskill) { item.clusterSkill = cskill[1]; continue }
    const ccount = /^Cluster Jewel Node Count:\s*(\d+)/.exec(line)
    if (ccount) { item.clusterNodeCount = Number(ccount[1]); continue }
    const rad = /^Radius:\s*(.+)$/.exec(line)
    if (rad) { item.radius = rad[1].trim(); continue }
    const sock = /^Sockets:\s*(.*)$/.exec(line)
    if (sock) { item.sockets = sock[1].trim(); continue }
    const imp = /^Implicits:\s*(\d+)/.exec(line)
    if (imp) { implicitsLeft = Number(imp[1]); continue }
    if (line === 'Corrupted') { item.corrupted = true; continue }
    if (line === 'Mirrored') { item.mirrored = true; continue }
    const influence = /^(Shaper|Elder|Crusader|Hunter|Redeemer|Warlord) Item$/.exec(line)
    if (influence) { (item.influences ??= []).push(influence[1]); continue }
    if (implicitsLeft < 0) {
      for (const [re, key] of ITEM_NUMBERS) {
        const n = re.exec(line)
        if (n && Number(n[1]) > 0) item[key] = Number(n[1])
      }
      continue
    }
    // Flags PoB writes after the mods aren't mods.
    if (/^(Split|Unreleased|Foulborn|Fractured Item|Synthesised Item)$/.test(line)) continue
    if (implicitsLeft === 0 && NOT_A_MOD.test(line)) {
      for (const [re, key] of ITEM_NUMBERS) {
        const n = re.exec(line)
        if (n && Number(n[1]) > 0) item[key] ??= Number(n[1])
      }
      continue
    }
    let mod = line
    let allowed = true
    let kind: PobModKind = ''
    let range: number | undefined
    modLine++
    for (const tag of mod.matchAll(/\{([^}]*)\}/g)) {
      const r = /^range:([\d.]+)$/.exec(tag[1])
      if (r) range = Number(r[1])
      const v = /^variant:([\d,]+)$/.exec(tag[1])
      if (v && variants.length && !v[1].split(',').map(Number).some(n => variants.includes(n))) allowed = false
      if (tag[1] === 'crafted' || tag[1] === 'fractured') kind = tag[1]
    }
    mod = applyRange(mod.replace(/\{[^}]*\}/g, '').trim(), range ?? ranges?.get(modLine) ?? 0.5)
    if (!mod) continue
    if (implicitsLeft > 0) {
      implicitsLeft--
      if (allowed) {
        item.implicits.push(mod)
        implicitKinds.push(kind)
      }
    } else if (allowed) {
      item.mods.push(mod)
      kinds.push(kind)
    }
  }
  if (kinds.some(Boolean)) item.modKinds = kinds
  if (implicitKinds.some(Boolean)) item.implicitKinds = implicitKinds
  return item
}
