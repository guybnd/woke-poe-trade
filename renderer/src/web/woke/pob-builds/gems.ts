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
  // The act of the first quest that gives or unlocks it for the class; null
  // when the campaign never does (trade, drop, transfigured).
  act: number | null
  // Where that quest falls in the campaign, for ordering (QUEST_ORDER).
  step: number
}

// Every quest that rewards or unlocks gems, in the order the campaign
// reaches them. Vendors start selling a gem when its quest is done, and Lilly
// Roth sells everything from Act 6. A quest missing here sorts last in its act.
const QUEST_ORDER = [
  'Enemy at the Gate',
  'Mercy Mission',
  'Breaking Some Eggs',
  'The Caged Brute',
  "The Siren's Cadence",
  'Intruders in Black',
  'Sharp and Cruel',
  'The Root of the Problem',
  'Lost in Love',
  'Sever the Right Hand',
  'A Fixture of Fate',
  'Breaking the Seal',
  'The Eternal Nightmare',
  'Fallen from Grace'
]

function questStep (s: Source): number {
  const i = QUEST_ORDER.indexOf(s[1])
  return s[0] * 100 + (i < 0 ? 99 : i)
}

// The first source the class can use: earliest quest, the reward before a
// vendor at the same quest.
function firstSource (name: string, cls: string): Source | null {
  const entry = DATA[name] ?? DATA[`${name} Support`]
  if (!entry) return null
  const idx = CLASSES.indexOf(cls)
  const fits = entry.s.filter(s => idx < 0 || s[4][idx] === '1')
  return [...fits].sort((a, b) => questStep(a) - questStep(b) || (a[3] === 'q' ? -1 : b[3] === 'q' ? 1 : 0))[0] ?? null
}

function sourceLabel (pick: Source | null): string | null {
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

// Every enabled gem in the build (or just `names`), ordered by the level you
// can use it, or with order 'campaign' by when the campaign hands it out (act,
// then quest, then level); gems it never gives come last, by level.
export function nextGems (details: PobDetails, charLevel: number | null, className: string, names?: string[], order: 'level' | 'campaign' = 'level'): NextGem[] {
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
    const first = firstSource(name, cls)
    out.push({
      name,
      requiredLevel: req,
      source: sourceLabel(first),
      when: req <= level ? 'now' : req <= level + 6 ? 'soon' : 'later',
      act: first ? first[0] : null,
      step: first ? questStep(first) : Infinity
    })
  }
  const byLevel = (a: NextGem, b: NextGem) => a.requiredLevel - b.requiredLevel || a.name.localeCompare(b.name)
  return out.sort(order === 'campaign' ? (a, b) => (a.step - b.step) || byLevel(a, b) : byLevel)
}
