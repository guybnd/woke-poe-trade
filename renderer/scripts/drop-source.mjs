// A restricted unique's source in a word or two, for the chip on a unique
// list ("Uber Eater", "Breach", "Vendor recipe"). Built from the wiki's drop
// text, the monsters it lists and its acquisition tags; the full text stays in
// the hover. `guess` when the wiki says it's restricted but not where from.

// League mechanics the wiki's drop text names, as a chip says them. First match wins.
const MECHANICS = [
  [/\bvendor recipe|vendoring\b/i, 'Vendor recipe'],
  [/\bCurio Display|\bGrand Heist|\bHeist\b|\bSmuggler's Cache/i, 'Heist'],
  [/\bTemple of Atzoatl|\bincursion room/i, 'Temple'],
  [/\bSyndicate|\bSafehouse|\bHideout/i, 'Syndicate'],
  [/\bKingsmarch|\bshipping/i, 'Kingsmarch'],
  [/\bExpedition|\bLogbook|\bRunic monsters/i, 'Expedition'],
  [/\bLabyrinth\b/i, 'Labyrinth'],
  [/\bmercenary\b.*\bduel/i, 'Mercenaries'],
  [/\bContract\b/, 'Heist'],
  [/\bFate\b/, 'Fates'],
  [/\bCursed Words\b/i, 'Cursed Words'],
  [/\bAltar of Corruption\b|\bdouble corrupt/i, 'Double corrupt'],
  [/\bcombin(?:e|ing)\b.*\b(?:pieces|grid)\b|\bPrimordial Fragments\b/i, 'Combined'],
  [/\bBlight/i, 'Blight'],
  [/\bDelirium|\bSimulacrum/i, 'Delirium'],
  [/\bSanctum/i, 'Sanctum'],
  [/\bUltimatum|\bTrialmaster/i, 'Ultimatum'],
  [/\bRitual/i, 'Ritual'],
  [/\bHarvest/i, 'Harvest'],
  [/\bwarband/i, 'Warbands'],
  [/\bAzurite Mine|\bDelve/i, 'Delve'],
  [/\bMirage|\bAstral monsters/i, 'Mirage'],
  [/\bBreach/i, 'Breach'],
  [/\bLegion|\bTimeless/i, 'Legion'],
  [/\bAbyss/i, 'Abyss'],
  [/\bBestiary|\bBeast/i, 'Bestiary'],
  [/\bMetamorph/i, 'Metamorph'],
  [/\bfishing|\bfished/i, 'Fishing'],
  [/\bMaven/i, 'Maven'],
  [/\bMap Boss|\bmap bosses/i, 'Map bosses'],
  [/\bKirac|\bTujen/i, 'Vendor'],
  [/\bdivination cards?\b/i, 'Div cards'],
  [/\bVaal Orb|\bcorrupt(?:ing|ion)\b.*\btransform/i, 'Vaal Orb'],
  [/\bBlessing|\bupgrade[ds]?\b/i, 'Upgrade']
]

// Acquisition tags that name a mechanic; the rest ("league-specific") say nothing.
const TAG_LABEL = {
  'corruption transformation': 'Vaal Orb',
  fishing: 'Fishing'
}
const NOT_A_SOURCE = new Set(['league-specific'])

// "Uber Incarnation of Neglect"; the chip ellipsises anything longer on screen.
const MAX = 28

// What the "drops from X" pattern catches that isn't a boss.
const NOT_A_BOSS = [
  [/^Curio Display|^Smuggler/, 'Heist'],
  [/^Runic\b/, 'Expedition'],
  [/^Astral$/, 'Mirage'],
  [/^T1[0-6]$/, 'Map bosses'],
  [/^King$/, 'King in the Mists'],
  [/^Spirit Beasts?$/, 'Bestiary'],
  [/^(?:Maraketh|Eternal|Vaal|Karui|Templar)$/, 'Legion'],
  [/Warbands?$|^Renegades$/, 'Warbands'],
  [/^Rare$/, 'Rare enemies'],
  [/^Synthesis$/, 'Synthesis']
]

function tidy (s) {
  return s.replace(/^the /i, '').replace(/[.,;:]+$/, '').trim()
}

// "Drops from Uber Exarch." / "Only drops from regular Atziri in ..." /
// "Can drop from Uber Uber Elder" -> the boss.
function bossFromText (text) {
  const m = /\b(?:[Dd]rops?|[Dd]ropped|[Oo]btained) (?:only )?from (?:the |regular |a |an )?([A-Z][\w'-]*(?: (?:[A-Z][\w'-]*|of|the))*)/.exec(text)
  if (!m) return null
  // "Drops from A, B, C": several bosses, the mechanic says it better.
  // "Aul, the Crystal King" is one boss with its title.
  if (/^, (?!the )[A-Z]/.test(text.slice(m.index + m[0].length))) return null
  const name = tidy(m[1])
  for (const [re, label] of NOT_A_BOSS) if (re.test(name)) return label
  // "Drops from Synthesised Map Bosses" is a mechanic, not a boss.
  if (/\bbosses\b|\bmonsters\b|\benemies\b/i.test(name)) return null
  return name.length <= MAX ? name : null
}

// Several monsters: the one name they share ("The Elder", "Atziri"), or how many.
function bossFromMonsters (names) {
  const uniq = [...new Set(names)]
  if (uniq.length > 1 && uniq.every(n => /^(?:Uber )?Incarnation of /.test(n))) return 'Incarnations'
  if (uniq.length === 1) return tidy(uniq[0].replace(/,.*$/, ''))
  if (uniq.length === 2) {
    const both = `${tidy(uniq[0].replace(/,.*$/, ''))} or ${tidy(uniq[1].replace(/,.*$/, ''))}`
    if (both.length <= MAX) return both
  }
  return null
}

/**
 * @param {{ text?: string, monsters?: string[], tags?: string[], disabled?: boolean }} row
 * @returns {{ s: string, guess?: boolean }}
 */
export function shortSource ({ text, monsters = [], tags = [], disabled = false }) {
  const t = text ?? ''
  // Race and event rewards: "final map bosses in the Legacy of Phrecia event"
  // or "Endless Heist" would otherwise read as a mechanic you can farm.
  if (/\bunobtainable in the core game|\brace events?\b|\bLegacy of Phrecia\b/i.test(t)) return { s: 'Event only' }
  if (/\bdrop disabled\b|\bno longer (?:drops|obtainable)\b/i.test(t)) return { s: 'No drop' }
  if (/\bvendor recipe\b/i.test(t)) return { s: 'Vendor recipe' }
  const boss = bossFromText(t)
  if (boss) return { s: boss }
  const fromMonsters = bossFromMonsters(monsters)
  if (fromMonsters && fromMonsters.length <= MAX) return { s: fromMonsters }
  for (const [re, label] of MECHANICS) if (re.test(t)) return { s: label }
  for (const tag of tags) {
    if (NOT_A_SOURCE.has(tag)) continue
    return { s: TAG_LABEL[tag] ?? tag }
  }
  if (monsters.length) return { s: 'Bosses' }
  // The game's own "drop disabled" flag: not a guess, the wiki just has no more.
  if (disabled) return { s: 'No drop' }
  return { s: 'Restricted', guess: true }
}
