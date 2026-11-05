// Map mods: pure rating logic, no Vue. Shared by the verdict card,
// the slim strip on APT's price check and the stash regex builder.
import type { MinStat } from './regex'

export type ModRating = 'deadly' | 'warn' | 'good' | 'ok'

// The Map mods tabs. Each has its own ratings and its own search: a rating on
// one never reaches another, even for a mod that rolls on both.
export type ModMode = 'maps' | 'heist' | 'charts'

export interface ModSearchOptions {
  highlight: 'good' | 'bad'
  autoTrim: boolean
}

export interface MapModProfile {
  id: number
  name: string
  // Map mod matcher string (as APT translates it, e.g.
  // "Players cannot Regenerate Life, Mana or Energy Shield") -> rating.
  ratings: Record<string, ModRating>
  // The same, for heist contracts and blueprints, and for charts.
  heistRatings?: Record<string, ModRating>
  chartRatings?: Record<string, ModRating>
  // Stash regex settings: minimum map stats and what to highlight.
  mins: Partial<Record<MinStat, number>>
  highlight: 'good' | 'bad'
  // Any one minimum is enough (OR) instead of all of them.
  minsAny?: boolean
  // When the search is over 250 characters, leave out the least important mods.
  autoTrim?: boolean
  // Highlight and auto-trim for the Heist and Charts searches.
  tabSearch?: Partial<Record<ModMode, ModSearchOptions>>
  // The T17 switch is off: T17 mods leave the Maps list and the stash regex.
  // Their ratings stay, and a check of a T17 map still flags them.
  hideT17?: boolean
}

export interface JuiceWeights {
  quantity: number
  rarity: number
  packSize: number
  currency: number
  scarabs: number
  maps: number
  divCards: number
}

export const DEFAULT_JUICE_WEIGHTS: JuiceWeights = {
  quantity: 1,
  rarity: 0.4,
  packSize: 0.8,
  currency: 1,
  scarabs: 1,
  maps: 0.6,
  divCards: 0.6
}

export interface MapModPreset {
  id: string
  label: string
  matchers: string[]
}

// Build weaknesses people usually filter for. Matcher strings come from the
// "AreaMods" stats in APT's stat data; older strings are kept so maps from
// previous leagues still match.
export const PRESETS: MapModPreset[] = [
  {
    id: 'phys-reflect',
    label: 'Physical reflect',
    matchers: [
      'Rare Monsters have Physical Thorns reflecting # Physical Damage',
      '#% of Melee Physical Damage taken reflected to Attacker'
    ]
  },
  {
    id: 'ele-reflect',
    label: 'Elemental reflect',
    matchers: [
      'Rare Monsters have Elemental Thorns reflecting # Elemental Damage'
    ]
  },
  { id: 'no-regen', label: 'No regen', matchers: ['Players cannot Regenerate Life, Mana or Energy Shield'] },
  {
    id: 'less-recovery',
    label: 'Less recovery',
    matchers: [
      'Players have #% less Recovery Rate of Life and Energy Shield',
      'Players have #% reduced Maximum total Life, Mana and Energy Shield Recovery per second from Leech'
    ]
  },
  { id: 'no-leech', label: 'No leech', matchers: ['Monsters cannot be Leeched from'] },
  { id: 'max-res', label: 'Max res down', matchers: ['Players have #% to all maximum Resistances'] },
  { id: 'ele-weakness', label: 'Curse: Ele Weakness', matchers: ['Players are Cursed with Elemental Weakness'] },
  { id: 'temp-chains', label: 'Curse: Temporal Chains', matchers: ['Players are Cursed with Temporal Chains'] },
  { id: 'enfeeble', label: 'Curse: Enfeeble', matchers: ['Players are Cursed with Enfeeble'] },
  { id: 'vulnerability', label: 'Curse: Vulnerability', matchers: ['Players are Cursed with Vulnerability'] },
  { id: 'hexproof', label: 'Hexproof monsters', matchers: ['Monsters are Hexproof', '#% less effect of Curses on Monsters'] },
  {
    id: 'avoid-ailments',
    label: 'Avoid ailments',
    matchers: [
      'Monsters have #% chance to Avoid Elemental Ailments',
      'Monsters have a #% chance to avoid Poison, Impale, and Bleeding'
    ]
  },
  { id: 'less-crit', label: 'Less crit damage', matchers: ['Monsters take #% reduced Extra Damage from Critical Strikes'] },
  { id: 'less-aoe', label: 'Less AoE', matchers: ['Players have #% less Area of Effect'] },
  { id: 'less-accuracy', label: 'Less accuracy', matchers: ['Players have #% less Accuracy Rating'] },
  { id: 'less-armour', label: 'Less armour', matchers: ['Players have #% less Armour', 'Players have #% less Defences'] },
  { id: 'suppress', label: 'Monster suppress', matchers: ['Monsters have #% chance to Suppress Spell Damage'] },
  { id: 'less-cooldown', label: 'Less cooldown', matchers: ['Players have #% less Cooldown Recovery Rate'] },
  { id: 'buff-expiry', label: 'Buffs expire faster', matchers: ['Buffs on Players expire #% faster'] },
  {
    id: 'flasks',
    label: 'Weaker flasks',
    matchers: [
      'Players gain #% reduced Flask Charges',
      'Players have #% less effect of Flasks applied to them',
      'Players have #% chance to be targeted by a Meteor when they use a Flask',
      'Players are targeted by a Meteor when they use a Flask'
    ]
  },
  {
    id: 'auras',
    label: 'Aura penalties',
    matchers: [
      'Players have #% reduced effect of Non-Curse Auras from Skills',
      'Auras from Player Skills which affect Allies also affect Enemies'
    ]
  },
  { id: 'no-exposure', label: 'No exposure', matchers: ['Players cannot inflict Exposure'] },
  { id: 'ele-pen', label: 'Monster ele pen', matchers: ['Monster Damage Penetrates #% Elemental Resistances'] },
  {
    id: 'charges',
    label: 'Charge steal',
    matchers: [
      'Monsters have #% chance to steal Power, Frenzy and Endurance charges on Hit',
      'Monsters steal Power, Frenzy and Endurance charges on Hit'
    ]
  },
  { id: 'cannot-stun', label: 'Monsters unstunnable', matchers: ['Monsters cannot be Stunned'] },
  {
    // Tier 17 only.
    id: 't17-killers',
    label: 'T17 run-killers',
    matchers: [
      'Rare Monsters have Volatile Cores',
      'Rare Monsters have #% chance to have a Volatile Core',
      'Players are assaulted by Bloodstained Sawblades',
      "Monsters' Action Speed cannot be modified to below Base Value",
      'Area contains Drowning Orbs',
      'The Maven interferes with Players',
      'Area contains Runes of the Searing Exarch',
      'Monsters gain #% of their Physical Damage as Extra Damage of a random Element'
    ]
  }
]

// Mods the game has reworded. The old wording no longer rolls, so a rating on
// it would never match a map.
const REWORDED: Record<string, string[]> = {
  'Monsters reflect #% of Physical Damage': [
    'Rare Monsters have Physical Thorns reflecting # Physical Damage',
    '#% of Melee Physical Damage taken reflected to Attacker'
  ],
  'Monsters reflect #% of Elemental Damage': ['Rare Monsters have Elemental Thorns reflecting # Elemental Damage']
}

// Moves a rating from an old wording to the new one. A rating already on the
// new wording is the player's own and stays.
export function carryRewordedRatings (ratings: Record<string, ModRating>) {
  for (const [old, current] of Object.entries(REWORDED)) {
    const rating = ratings[old]
    if (!rating) continue
    Reflect.deleteProperty(ratings, old)
    for (const m of current) ratings[m] ??= rating
  }
}

// Rated mods that aren't in the game's current mod list.
export function deadRatings (ratings: Record<string, ModRating>, known: Iterable<string>): string[] {
  const set = new Set(known)
  return Object.keys(ratings).filter(m => !set.has(m))
}

// Mods in a preset are the well-known run-killers; auto-trim keeps them longest.
export function modPriority (matcher: string): number {
  return PRESETS.some(p => p.matchers.includes(matcher)) ? 1 : 0
}

// Copy of `ratings` with `matchers` set to `rating` ('ok' removes them).
export function withRating (ratings: Record<string, ModRating>, matchers: string[], rating: ModRating): Record<string, ModRating> {
  const out = Object.fromEntries(Object.entries(ratings).filter(([m]) => !matchers.includes(m)))
  if (rating !== 'ok') {
    for (const m of matchers) out[m] = rating
  }
  return out
}

// Applies a preset: every matcher in it gets `rating` ('ok' removes it).
export function applyPreset (profile: MapModProfile, preset: MapModPreset, rating: ModRating) {
  profile.ratings = withRating(profile.ratings, preset.matchers, rating)
}

// The rating a preset chip shows: shared by all its matchers, else 'ok'.
export function presetRating (profile: MapModProfile, preset: MapModPreset): ModRating {
  const first = profile.ratings[preset.matchers[0]] ?? 'ok'
  return preset.matchers.every(m => (profile.ratings[m] ?? 'ok') === first) ? first : 'ok'
}

// Chip click order: ok -> warn -> deadly -> ok.
export function nextPresetRating (r: ModRating): ModRating {
  if (r === 'ok') return 'warn'
  if (r === 'warn') return 'deadly'
  return 'ok'
}

export function modRatings (profile: MapModProfile, mode: ModMode): Record<string, ModRating> {
  if (mode === 'heist') return profile.heistRatings ?? {}
  if (mode === 'charts') return profile.chartRatings ?? {}
  return profile.ratings
}

export function setModRatings (profile: MapModProfile, mode: ModMode, ratings: Record<string, ModRating>) {
  if (mode === 'heist') profile.heistRatings = ratings
  else if (mode === 'charts') profile.chartRatings = ratings
  else profile.ratings = ratings
}

export function searchOptions (profile: MapModProfile, mode: ModMode): ModSearchOptions {
  if (mode === 'maps') return { highlight: profile.highlight, autoTrim: !!profile.autoTrim }
  return { highlight: 'good', autoTrim: false, ...profile.tabSearch?.[mode] }
}

export function setSearchOption (profile: MapModProfile, mode: ModMode, patch: Partial<ModSearchOptions>) {
  const next = { ...searchOptions(profile, mode), ...patch }
  if (mode === 'maps') {
    profile.highlight = next.highlight
    profile.autoTrim = next.autoTrim
  } else {
    profile.tabSearch = { ...profile.tabSearch, [mode]: next }
  }
}

export type ModListRow =
  | { kind: 'head', rating: ModRating, count: number }
  | { kind: 'mod', matcher: string }

// The Map mods list: picked mods on top, by rating, then the rest, with a
// heading over each group. `ratings` is the order to sort by, not always the
// live ratings, so a row doesn't jump away while it's being rated.
export function modListRows (mods: string[], ratings: Record<string, ModRating>): ModListRow[] {
  const groups: Record<ModRating, string[]> = { deadly: [], warn: [], good: [], ok: [] }
  for (const m of mods) groups[ratings[m] ?? 'ok'].push(m)
  if (groups.ok.length === mods.length) return mods.map(matcher => ({ kind: 'mod', matcher }))
  const rows: ModListRow[] = []
  for (const rating of ['deadly', 'warn', 'good', 'ok'] as ModRating[]) {
    if (!groups[rating].length) continue
    rows.push({ kind: 'head', rating, count: groups[rating].length })
    for (const matcher of groups[rating]) rows.push({ kind: 'mod', matcher })
  }
  return rows
}

// Rating cycle when clicking a mod in the popup.
export function nextModRating (r: ModRating): ModRating {
  switch (r) {
    case 'ok': return 'deadly'
    case 'deadly': return 'warn'
    case 'warn': return 'good'
    default: return 'ok'
  }
}

export interface CheckedMod {
  matcher: string
  // Display text with the roll filled in.
  text: string
  rating: ModRating
}

export type Verdict = 'skip' | 'careful' | 'run'

export interface MapVerdict {
  verdict: Verdict
  mods: CheckedMod[]
  deadly: CheckedMod[]
  warn: CheckedMod[]
  good: CheckedMod[]
}

const RATING_ORDER: Record<ModRating, number> = { deadly: 0, warn: 1, good: 2, ok: 3 }

export function fillRoll (matcher: string, roll: number | undefined): string {
  if (roll == null) return matcher
  return matcher.replace('#', String(roll))
}

export function rateMods (mods: Array<{ matcher: string, roll?: number }>, profile: MapModProfile): MapVerdict {
  const checked: CheckedMod[] = mods.map(m => ({
    matcher: m.matcher,
    text: fillRoll(m.matcher, m.roll),
    rating: profile.ratings[m.matcher] ?? 'ok'
  }))
  checked.sort((a, b) => RATING_ORDER[a.rating] - RATING_ORDER[b.rating])
  const deadly = checked.filter(m => m.rating === 'deadly')
  const warn = checked.filter(m => m.rating === 'warn')
  const good = checked.filter(m => m.rating === 'good')
  const verdict: Verdict = deadly.length ? 'skip' : warn.length ? 'careful' : 'run'
  return { verdict, mods: checked, deadly, warn, good }
}

export interface JuiceInput {
  quantity?: number
  rarity?: number
  packSize?: number
  currency?: number
  scarabs?: number
  maps?: number
  divCards?: number
  // Mods rated "good" (e.g. two bosses, extra rare mods).
  goodMods?: number
}

export interface JuiceResult {
  score: number
  label: 'Great' | 'Good' | 'OK' | 'Low'
}

// Rough values for a juiced tier 16 eight-mod map; a map at these values
// scores about 85.
const JUICE_REF = { quantity: 120, rarity: 70, packSize: 40, more: 100 }

function part (value: number | undefined, ref: number): number {
  if (!value || value < 0) return 0
  return Math.min(value / ref, 1.25)
}

export function juiceScore (input: JuiceInput, w: JuiceWeights = DEFAULT_JUICE_WEIGHTS): JuiceResult {
  const baseW = w.quantity + w.rarity + w.packSize
  const base = baseW > 0
    ? (w.quantity * part(input.quantity, JUICE_REF.quantity) +
       w.rarity * part(input.rarity, JUICE_REF.rarity) +
       w.packSize * part(input.packSize, JUICE_REF.packSize)) / baseW
    : 0
  // "More X" stats stack: a map with several of them is juicier than one
  // with a single high roll, so they are summed then capped.
  const moreSum =
    w.currency * (input.currency ?? 0) +
    w.scarabs * (input.scarabs ?? 0) +
    w.maps * (input.maps ?? 0) +
    w.divCards * (input.divCards ?? 0)
  const more = part(moreSum, JUICE_REF.more)
  const bonus = Math.min((input.goodMods ?? 0) * 0.03, 0.09)
  const raw = 0.7 * base + 0.25 * more + bonus
  const score = Math.max(0, Math.min(100, Math.round(raw * 100 / 1.0)))
  const label = score >= 80 ? 'Great' : score >= 60 ? 'Good' : score >= 35 ? 'OK' : 'Low'
  return { score, label }
}

// Short labels for the slim strip, e.g. "Phys reflect".
export function shortLabel (matcher: string): string {
  for (const p of PRESETS) {
    if (p.matchers.includes(matcher)) return p.label
  }
  const s = matcher
    .replace(/^(Monsters|Players|Area|Rare Monsters|Unique Boss)( have| are| has| deal| gain)?\s*/i, '')
    .replace(/#%?\s*/g, '')
    .trim()
  return s.length > 28 ? s.slice(0, 27) + '…' : s
}

// A new profile with everything this one has, under its own id and name.
export function copyOfProfile (profile: MapModProfile, id: number): MapModProfile {
  return {
    ...profile,
    id,
    name: `${profile.name} copy`,
    ratings: { ...profile.ratings },
    heistRatings: { ...profile.heistRatings },
    chartRatings: { ...profile.chartRatings },
    tabSearch: { ...profile.tabSearch },
    mins: { ...profile.mins }
  }
}

export function defaultProfile (): MapModProfile {
  return {
    id: 1,
    name: 'Default',
    mins: {},
    highlight: 'good',
    ratings: {
      'Players cannot Regenerate Life, Mana or Energy Shield': 'warn',
      'Players have #% to all maximum Resistances': 'warn',
      // Flat damage back at you, so careful rather than can't run.
      'Rare Monsters have Physical Thorns reflecting # Physical Damage': 'warn',
      'Rare Monsters have Elemental Thorns reflecting # Elemental Damage': 'warn',
      '#% of Melee Physical Damage taken reflected to Attacker': 'warn',
      'Area contains two Unique Bosses': 'good'
    }
  }
}
