// Gem shopping list for a build while levelling: when each gem can be used
// and where to get it in the campaign, for the character's class.
// Data: gem-sources.json, generated from exile-leveling (MIT, see
// LICENSE-exile-leveling.txt): { name: { l: required level, a: colour,
// s: sources } }, colour = r/g/b/w (primary attribute), source = [act, quest,
// npc, 'q' (quest reward) | 'v' (vendor), class mask].
import type { InjectionKey, Ref } from 'vue'
import raw from './gem-sources.json'
import type { PobDetails } from './widget'

export type GemSource = [number, string, string, string, string]
type Source = GemSource
export type GemColour = 'r' | 'g' | 'b' | 'w'
const DATA = raw as unknown as Record<string, { l: number, a: GemColour, s: Source[] }>

export interface GemData {
  // The item name, as loot filters and the trade site spell it
  // ("Combustion Support" where PoB says "Combustion").
  name: string
  requiredLevel: number
  colour: GemColour
  sources: GemSource[]
}

export function gemData (name: string): GemData | null {
  const key = DATA[name] ? name : DATA[`${name} Support`] ? `${name} Support` : null
  if (key) {
    const d = DATA[key]
    return { name: key, requiredLevel: d.l, colour: d.a ?? 'w', sources: d.s }
  }
  // Transfigured gems ("Kinetic Blast of Clustering") aren't in the campaign
  // data: they share their base gem's colour and level, and no quest or
  // vendor hands them out.
  const i = name.lastIndexOf(' of ')
  const base = i > 0 ? DATA[name.slice(0, i)] : undefined
  return base ? { name, requiredLevel: base.l, colour: base.a ?? 'w', sources: [] } : null
}

export const CLASS_NAMES = ['Duelist', 'Marauder', 'Ranger', 'Scion', 'Shadow', 'Templar', 'Witch']
const CLASSES = CLASS_NAMES

// Ascendancies map to their base class.
const ASCENDANCY_CLASS: Record<string, string> = {
  Slayer: 'Duelist',
  Gladiator: 'Duelist',
  Champion: 'Duelist',
  Juggernaut: 'Marauder',
  Berserker: 'Marauder',
  Chieftain: 'Marauder',
  Deadeye: 'Ranger',
  Raider: 'Ranger',
  Pathfinder: 'Ranger',
  Warden: 'Ranger',
  Ascendant: 'Scion',
  Reliquarian: 'Scion',
  Assassin: 'Shadow',
  Saboteur: 'Shadow',
  Trickster: 'Shadow',
  Inquisitor: 'Templar',
  Hierophant: 'Templar',
  Guardian: 'Templar',
  Necromancer: 'Witch',
  Occultist: 'Witch',
  Elementalist: 'Witch'
}

export function baseClass (name: string): string {
  return CLASSES.includes(name) ? name : ASCENDANCY_CLASS[name] ?? ''
}

export interface NextGem {
  name: string
  requiredLevel: number
  // Cheapest way to get it: quest reward first, then the first vendor.
  source: string | null
  // Usable now (required level reached), soon (within 6 levels) or later.
  when: 'now' | 'soon' | 'later'
}

function sourceFor (name: string, cls: string): string | null {
  const entry = DATA[name] ?? DATA[`${name} Support`]
  if (!entry) return null
  const idx = CLASSES.indexOf(cls)
  const fits = entry.s.filter(s => idx < 0 || s[4][idx] === '1')
  const pick = fits.find(s => s[3] === 'q') ?? fits.sort((a, b) => a[0] - b[0])[0]
  if (!pick) return null
  return `${pick[3] === 'q' ? 'Reward' : 'Buy from ' + pick[2]}: ${pick[1]} (Act ${pick[0]})`
}

// Every way the class gets the gem in the campaign: the quest reward, and the
// first vendor that sells it. One line each, for a gem's tooltip.
export function gemWhere (name: string, className: string): string {
  const entry = DATA[name] ?? DATA[`${name} Support`]
  if (!entry) return gemData(name) ? 'Not in the campaign: buy or drop' : ''
  const idx = CLASSES.indexOf(baseClass(className))
  const fits = entry.s.filter(s => idx < 0 || s[4][idx] === '1')
  const reward = fits.find(s => s[3] === 'q')
  const vendor = fits.filter(s => s[3] === 'v').sort((a, b) => a[0] - b[0])[0]
  const lines: string[] = []
  if (reward) lines.push(`Reward: ${reward[1]} (Act ${reward[0]})`)
  if (vendor) lines.push(`Buy from ${vendor[2]}: ${vendor[1]} (Act ${vendor[0]})`)
  return lines.length ? lines.join('\n') : 'Not sold to this class in the campaign: buy or drop'
}

// The build panel hands its class to every gem name inside it.
export const GEM_CLASS = Symbol('pob gem class') as InjectionKey<Ref<string>>

export function requiredLevel (name: string): number | null {
  return gemData(name)?.requiredLevel ?? null
}

// Every enabled gem in the build (or just `names`), ordered by when you can
// use it.
export function nextGems (details: PobDetails, charLevel: number | null, className: string, names?: string[]): NextGem[] {
  const cls = baseClass(className || details.className)
  const level = charLevel ?? 1
  const list = names ?? details.skills
    .filter(g => g.enabled)
    .flatMap(g => g.gems.filter(x => x.enabled).map(x => x.name))
  const seen = new Set<string>()
  const out: NextGem[] = []
  for (const name of list) {
    if (!name || seen.has(name)) continue
    seen.add(name)
    const req = requiredLevel(name)
    if (req == null) continue
    out.push({
      name,
      requiredLevel: req,
      source: sourceFor(name, cls),
      when: req <= level ? 'now' : req <= level + 6 ? 'soon' : 'later'
    })
  }
  return out.sort((a, b) => a.requiredLevel - b.requiredLevel || a.name.localeCompare(b.name))
}
