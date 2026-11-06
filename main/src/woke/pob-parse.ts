// Light, dependency-free reading of Path of Building build XML.
// PoB writes a predictable layout, so attribute regexes are enough for the
// summary we need; anything missing just comes back empty.

export interface PobSummary {
  className: string
  ascendClassName: string
  level: number | null
  mainSkill: string
}

export interface PobGem {
  name: string
  level: number | null
  quality: number | null
  enabled: boolean
  support: boolean
}

export interface PobSkillGroup {
  label: string
  slot: string
  enabled: boolean
  isMain: boolean
  source?: string
  gems: PobGem[]
}

export interface PobTreeSpec {
  title: string
  url: string
  isActive: boolean
  // Holds nothing: a heading such as "~~~ ENDGAME ~~~" between real sets.
  divider?: boolean
}

export interface PobSkillSet {
  title: string
  isActive: boolean
  groups: PobSkillGroup[]
  divider?: boolean
}

export type PobRarity = 'NORMAL' | 'MAGIC' | 'RARE' | 'UNIQUE' | 'RELIC' | ''

export interface PobItem {
  rarity: PobRarity
  // Unique or rare name; the full name for magic and normal items.
  name: string
  // Base type when PoB lists it on its own line (uniques and rares).
  base: string
  // As PoB writes it, e.g. "R-G-B B".
  sockets: string
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
  corrupted?: boolean
  mirrored?: boolean
  // Shaper, Elder, Crusader, Hunter, Redeemer, Warlord
  influences?: string[]
}

export type PobModKind = '' | 'crafted' | 'fractured'

export interface PobItemSlot {
  slot: string
  item: PobItem
}

export interface PobItemSet {
  title: string
  isActive: boolean
  slots: PobItemSlot[]
  divider?: boolean
}

export interface PobDetails extends PobSummary {
  notes: string
  // Notes with PoB's colour codes kept (^7, ^xFFFFFF).
  notesRaw: string
  // Groups of the active skill set.
  skills: PobSkillGroup[]
  // Every skill set (levelling builds often have one per act or level range).
  skillSets: PobSkillSet[]
  trees: PobTreeSpec[]
  itemSets: PobItemSet[]
}

function attrs (tag: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of tag.matchAll(/([A-Za-z_:][\w:.-]*)="([^"]*)"/g)) {
    out[m[1]] = decodeEntities(m[2])
  }
  return out
}

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

const COLOUR_CODE = /\^x[0-9a-fA-F]{6}|\^\d/g

// Set titles may carry PoB's colour codes (^2, ^xFFFFFF).
function plainTitle (title: string | undefined): string {
  return (title ?? '').replace(COLOUR_CODE, '').trim()
}

function num (value: string | undefined): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseGroups (body: string, mainSocketGroup: number | null): PobSkillGroup[] {
  const groups: PobSkillGroup[] = []
  for (const m of body.matchAll(/<Skill\b([^>]*?)(?:\/>|>([\s\S]*?)<\/Skill>)/g)) {
    const a = attrs(m[1])
    const gems: PobGem[] = []
    for (const g of (m[2] ?? '').matchAll(/<Gem\b([^>]*?)\/?>/g)) {
      const ga = attrs(g[1])
      const id = `${ga.gemId ?? ''} ${ga.skillId ?? ''}`
      gems.push({
        name: ga.nameSpec || ga.skillId || '',
        level: num(ga.level),
        quality: num(ga.quality),
        enabled: ga.enabled !== 'false',
        support: /SupportGem|(^|\s)Support/.test(id)
      })
    }
    groups.push({
      label: a.label ?? '',
      slot: a.slot ?? '',
      enabled: a.enabled !== 'false',
      isMain: mainSocketGroup != null && groups.length + 1 === mainSocketGroup,
      ...(a.source ? { source: a.source } : {}),
      gems
    })
  }
  return groups
}

// Skills may sit directly under <Skills> or inside <SkillSet> blocks.
// mainSocketGroup on <Build> counts groups of the active set.
function parseSkillSets (xml: string, mainSocketGroup: number | null): PobSkillSet[] {
  const skillsBlock = /<Skills\b([^>]*)>([\s\S]*?)<\/Skills>/.exec(xml)
  if (!skillsBlock) return []
  const body = skillsBlock[2]
  const activeSet = attrs(skillsBlock[1]).activeSkillSet
  const sets: PobSkillSet[] = []
  let i = 0
  for (const m of body.matchAll(/<SkillSet\b([^>]*?)(?:\/>|>([\s\S]*?)<\/SkillSet>)/g)) {
    i++
    const a = attrs(m[1])
    const isActive = activeSet ? a.id === activeSet : i === 1
    const groups = parseGroups(m[2] ?? '', isActive ? mainSocketGroup : null)
    sets.push({
      title: plainTitle(a.title) || `Skill set ${i}`,
      isActive,
      groups,
      ...(groups.some(g => g.gems.length) ? {} : { divider: true })
    })
  }
  if (!sets.length) sets.push({ title: 'Default', isActive: true, groups: parseGroups(body, mainSocketGroup) })
  if (!sets.some(s => s.isActive)) sets[0].isActive = true
  return sets
}

function parseTrees (xml: string): PobTreeSpec[] {
  const tree = /<Tree\b([^>]*)>([\s\S]*?)<\/Tree>/.exec(xml)
  if (!tree) return []
  const active = num(attrs(tree[1]).activeSpec)
  const out: PobTreeSpec[] = []
  let i = 0
  for (const m of tree[2].matchAll(/<Spec\b([^>]*?)(?:\/>|>([\s\S]*?)<\/Spec>)/g)) {
    i++
    const a = attrs(m[1])
    const urlMatch = /<URL>\s*([\s\S]*?)\s*<\/URL>/.exec(m[2] ?? '')
    const url = urlMatch ? decodeEntities(urlMatch[1].trim()) : ''
    // A class start, or next to it, with no points spent.
    const empty = (a.nodes ?? '').split(',').filter(Boolean).length <= 2
    out.push({ title: plainTitle(a.title) || `Tree ${i}`, url, isActive: active === i, ...(empty ? { divider: true } : {}) })
  }
  // No (or a stale) activeSpec: PoB opens the first tree.
  if (out.length && !out.some(t => t.isActive)) out[0].isActive = true
  return out
}


// PoB item text: "Rarity: X", name line(s), then "Key: value" lines, then
// "Implicits: N" followed by N implicit lines and the explicit mods.
// Mod lines may start with {tags}; {variant:1,2} limits a line to variants.
const ITEM_META = /^(Unique ID|Item Level|Quality|Sockets|LevelReq|Requires|Selected Variant|Selected Alt Variant|Variant|Has Alt Variant|League|Source|Upgrade|Radius|Limited to|Crafted|Prefix|Suffix|Catalyst|CatalystQuality|Cluster Jewel Skill|Cluster Jewel Node Count|Armour|Evasion|Energy Shield|Ward|Talisman Tier|Item Class|Shaper Item|Elder Item|Crusader Item|Hunter Item|Redeemer Item|Warlord Item|Searing Exarch Item|Eater of Worlds Item|Synthesised Item|Fractured Item|Corrupted|Mirrored|Split|Unreleased|Foulborn|Note)\b/

const ITEM_NUMBERS: Array<[RegExp, 'quality' | 'armour' | 'evasion' | 'energyShield' | 'ward' | 'itemLevel' | 'levelReq']> = [
  [/^Quality:\s*\+?(\d+)/, 'quality'],
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

function parseItemSets (xml: string): PobItemSet[] {
  const block = /<Items\b([^>]*)>([\s\S]*?)<\/Items>/.exec(xml)
  if (!block) return []
  const items = new Map<string, PobItem>()
  for (const m of block[2].matchAll(/<Item\b([^>]*)>([\s\S]*?)<\/Item>/g)) {
    const id = attrs(m[1]).id
    // Newer PoB versions put <ModRange> etc. inside <Item>; keep the text only.
    const ranges = new Map<number, number>()
    for (const r of m[2].matchAll(/<ModRange\b([^>]*?)\/?>/g)) {
      const a = attrs(r[1])
      const line = num(a.id)
      const range = num(a.range)
      if (line != null && range != null) ranges.set(line, range)
    }
    if (id) items.set(id, parseItemText(m[2].replace(/<[^>]+>/g, ''), ranges))
  }
  const slotsOf = (body: string): PobItemSlot[] => {
    const out: PobItemSlot[] = []
    for (const s of body.matchAll(/<Slot\b([^>]*?)\/?>/g)) {
      const a = attrs(s[1])
      const item = a.itemId && a.itemId !== '0' ? items.get(a.itemId) : undefined
      if (item && a.name) out.push({ slot: a.name, item })
    }
    return out
  }
  const active = attrs(block[1]).activeItemSet
  const sets: PobItemSet[] = []
  let i = 0
  for (const m of block[2].matchAll(/<ItemSet\b([^>]*?)(?:\/>|>([\s\S]*?)<\/ItemSet>)/g)) {
    i++
    const a = attrs(m[1])
    const slots = slotsOf(m[2] ?? '')
    sets.push({
      title: plainTitle(a.title) || `Item set ${i}`,
      isActive: active ? a.id === active : i === 1,
      slots,
      ...(slots.length ? {} : { divider: true })
    })
  }
  if (!sets.length) {
    const outside = block[2].replace(/<Item\b[\s\S]*?<\/Item>/g, '')
    sets.push({ title: 'Default', isActive: true, slots: slotsOf(outside) })
  }
  if (!sets.some(s => s.isActive)) sets[0].isActive = true
  return sets
}

function mainSkillName (skills: PobSkillGroup[]): string {
  const main = skills.find(s => s.isMain) ?? skills.find(s => s.enabled && s.gems.length)
  if (!main) return ''
  const gem = main.gems.find(g => g.enabled && !g.support && !/support/i.test(g.name)) ?? main.gems[0]
  return gem?.name || main.label
}

export function parseBuild (xml: string): PobDetails {
  const buildTag = /<Build\b([^>]*)>/.exec(xml)
  const b = buildTag ? attrs(buildTag[1]) : {}
  const skillSets = parseSkillSets(xml, num(b.mainSocketGroup))
  const skills = (skillSets.find(s => s.isActive) ?? skillSets[0])?.groups ?? []
  const notesMatch = /<Notes>([\s\S]*?)<\/Notes>/.exec(xml)
  return {
    className: b.className ?? '',
    ascendClassName: (b.ascendClassName && b.ascendClassName !== 'None') ? b.ascendClassName : '',
    level: num(b.level),
    mainSkill: mainSkillName(skills),
    // PoB colour codes like ^7 or ^xFFFFFF are stripped.
    notes: notesMatch ? decodeEntities(notesMatch[1]).replace(COLOUR_CODE, '').trim() : '',
    notesRaw: notesMatch ? decodeEntities(notesMatch[1]).trim() : '',
    skills,
    skillSets,
    trees: parseTrees(xml),
    itemSets: parseItemSets(xml)
  }
}

export function summarize (details: PobDetails): PobSummary {
  const { className, ascendClassName, level, mainSkill } = details
  return { className, ascendClassName, level, mainSkill }
}
