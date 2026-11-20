import { VARIABLE_ITEMS } from '../shared/unid-prices'

// Pinnacle boss entry costs and drop tables.
//
// GGG does not publish drop rates. A `chance` here is the share of community
// kills that dropped the item (so "expected value" = chance x price works
// whether or not drops are independent). Bosses without public rates list
// their possible drops with `chance: null`; the player fills them in from
// their own kill log or by typing a rate.
//
// Item names are poe.ninja names, so prices resolve through the market tracker.

export interface DataSource {
  label: string
  url: string
  // Number of kills the rates were measured on.
  kills: number | null
  note?: string
}

export interface BossDrop {
  name: string
  // Probability (0..1) that one kill drops this item; null = unknown.
  chance: number | null
  qty?: number
  // poe.ninja gem variant to price, e.g. '1' for a level 1 gem.
  variant?: string
  // Drops unidentified and its value depends on the roll (jewel keystone,
  // radius, ascendancy...). Priced from unidentified trade listings unless the
  // player picks poe.ninja or types a price.
  variable?: boolean
  // qty is part of an estimate (copies past one a kill), so it only applies
  // while the estimate is in use.
  estimateQty?: boolean
}

// Uniques that drop unidentified and whose value depends on what they roll.
// Priced from unidentified trade listings; poe.ninja only has one low row.
export { VARIABLE_ITEMS }

export interface BossEntry {
  name: string
  qty: number
}

export interface Boss {
  id: string
  name: string
  tier: 'uber' | 'pinnacle' | 'nightmare'
  entry: BossEntry[]
  // Default fight + travel time in seconds; the player can change it.
  runSeconds: number
  drops: BossDrop[]
  source: DataSource | null
  // Estimated chances (percent) by drop name, in place of estimates.ts.
  estimates?: Record<string, number>
  // Where those estimates come from.
  estimateSource?: { label: string, url: string }
}

const POE_HOW = 'https://poe.how/economy/bosses/'
const POEDB = 'https://poedb.tw/us/'

export const BOSSES: Boss[] = ([
  {
    id: 'uber-maven',
    name: 'Uber Maven',
    tier: 'uber',
    entry: [{ name: 'Reality Fragment', qty: 4 }],
    runSeconds: 240,
    source: { label: 'poe.how community runs (3.29)', url: POE_HOW + 'uber-maven', kills: 1350 },
    drops: [
      { name: 'Awakened Enlighten Support', chance: 0.0081, variant: '1' },
      { name: 'Awakened Empower Support', chance: 0.0059, variant: '1' },
      { name: 'Awakened Enhance Support', chance: 0.0074, variant: '1' },
      { name: 'Progenesis', chance: 0.0170 },
      { name: 'Eclipse Support', chance: 0.0252, variant: '1' },
      { name: 'Orb of Conflict', chance: 0.3319 },
      { name: 'Impossible Escape', chance: 0.3363 },
      { name: 'Shiny Reliquary Key', chance: 0.0096 },
      { name: "Viridi's Veil", chance: 0.5207 },
      { name: 'Grace of the Goddess', chance: 0.1259 },
      { name: 'Invert the Rules Support', chance: 0.1022, variant: '1' },
      { name: 'Curio of Potential', chance: 0.0489 },
      { name: 'Auspicious Ambitions', chance: null }
    ]
  },
  {
    id: 'uber-sirus',
    name: 'Uber Sirus',
    tier: 'uber',
    entry: [{ name: 'Awakening Fragment', qty: 4 }],
    runSeconds: 180,
    source: { label: 'poe.how community runs (3.29)', url: POE_HOW + 'uber-sirus', kills: 606 },
    drops: [
      { name: "Oriath's End", chance: 0.0875 },
      { name: 'Orb of Dominance', chance: 0.0594 },
      { name: "Awakener's Orb", chance: 0.198 },
      { name: 'Thread of Hope', chance: 0.4455 },
      { name: 'The Tempest Rising', chance: 0.2822 },
      { name: 'A Fate Worse Than Death', chance: 0.0479 },
      { name: 'Annihilation Support', chance: 0.0578, variant: '1' },
      { name: 'Oubliette Reliquary Key', chance: 0.0116 },
      { name: 'The Saviour', chance: 0.0066 },
      { name: "Zana's Ingenuity", chance: 0.1799 }
    ]
  },
  {
    id: 'uber-uber-elder',
    name: 'Uber Uber Elder',
    tier: 'uber',
    entry: [{ name: 'Decaying Fragment', qty: 4 }],
    runSeconds: 300,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'uber-uber-elder', kills: null },
    drops: [
      { name: 'Voidforge', chance: null },
      { name: 'Sublime Vision', chance: null },
      { name: 'Orb of Dominance', chance: null },
      { name: 'Decaying Reliquary Key', chance: null },
      { name: 'Soul Ascension', chance: null },
      { name: "Watcher's Eye", chance: null },
      { name: "Shaper's Exalted Orb", chance: null },
      { name: "Elder's Exalted Orb", chance: null },
      { name: 'Void of the Elements', chance: null },
      { name: 'The Eternity Shroud', chance: null },
      { name: 'Void Shockwave Support', chance: null, variant: '1' },
      { name: 'Call of the Void', chance: null },
      { name: 'Impresence', chance: null },
      { name: 'Curio of Decay', chance: null },
      { name: 'The Devourer of Minds', chance: null },
      { name: 'Auspicious Ambitions', chance: null },
      { name: 'Cooldown Recovery Support', chance: null, variant: '1' }
    ]
  },
  {
    id: 'uber-atziri',
    name: 'Uber Atziri',
    tier: 'uber',
    // 3.30: in a Temple of Atzoatl with the Cradle of Creation (area level
    // 84). poe.ninja prices Chronicles by their best room, so the entry is the
    // "Cradle of Creation (Tier 3)" row. It also pays for every other room.
    entry: [{ name: 'Cradle of Creation (Tier 3)', qty: 1 }],
    runSeconds: 240,
    source: { label: 'poe.how community runs (3.29)', url: POE_HOW + 'uber-atziri', kills: 60, note: 'Measured in 3.29, before Atziri moved to the Temple. Small sample: drops not seen in it have no rate. The Cradle of Creation Chronicle opens the whole temple, not only this fight.' },
    drops: [
      { name: 'The Vertex', chance: 0.4167 },
      { name: "Atziri's Splendour", chance: 0.35 },
      { name: 'Beauty', chance: 0.1333 },
      { name: 'Triumvirate Authority', chance: 0.10 },
      { name: "Atziri's Acuity", chance: 0.05 },
      { name: "Atziri's Reflection", chance: 0.05 },
      { name: "Atziri's Rule", chance: 0.0333 },
      { name: "Atziri's Disfavour", chance: null },
      { name: 'The Price of Devotion', chance: null },
      { name: 'Triskaidekaphobia', chance: null },
      { name: 'Greater Spell Echo Support', chance: null, variant: '1' },
      { name: 'Vaal Sacrifice Support', chance: null, variant: '1' },
      // 3.30 patch notes: Royal Visage in level 81+ temples; in Cradle of
      // Creation temples, Soul Cores of Intellect, Might and Finesse.
      { name: 'Royal Visage', chance: null },
      { name: 'Soul Core of Intellect', chance: null },
      { name: 'Soul Core of Might', chance: null },
      { name: 'Soul Core of Finesse', chance: null }
    ]
  },
  {
    id: 'uber-exarch',
    name: 'Uber Searing Exarch',
    tier: 'uber',
    entry: [{ name: 'Blazing Fragment', qty: 4 }],
    runSeconds: 240,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'uber-searing-exarch', kills: null },
    drops: [
      { name: 'The Celestial Brace', chance: null },
      { name: 'Forbidden Flame', chance: null },
      { name: 'Archive Reliquary Key', chance: null },
      { name: 'Exceptional Eldritch Ember', chance: null },
      { name: 'Curio of Absorption', chance: null },
      { name: "Annihilation's Approach", chance: null },
      { name: 'Eldritch Chaos Orb', chance: null },
      { name: 'Eldritch Orb of Annulment', chance: null },
      { name: 'The Annihilating Light', chance: null },
      { name: 'Crystallised Omniscience', chance: null },
      { name: 'Eldritch Exalted Orb', chance: null },
      { name: 'Overheat Support', chance: null, variant: '1' },
      { name: 'Auspicious Ambitions', chance: null }
    ]
  },
  {
    id: 'uber-eater',
    name: 'Uber Eater of Worlds',
    tier: 'uber',
    entry: [{ name: 'Devouring Fragment', qty: 4 }],
    runSeconds: 240,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'uber-eater-of-worlds', kills: null },
    drops: [
      { name: 'Nimis', chance: null },
      { name: 'Forbidden Flesh', chance: null },
      { name: 'Visceral Reliquary Key', chance: null },
      { name: 'Melding of the Flesh', chance: null },
      { name: 'Exceptional Eldritch Ichor', chance: null },
      { name: 'Curio of Absorption', chance: null },
      { name: 'Fruiting Astrolabe', chance: null },
      { name: 'Curio of Consumption', chance: null },
      { name: 'Templar Astrolabe', chance: null },
      { name: 'Ashes of the Stars', chance: null },
      { name: 'Eldritch Chaos Orb', chance: null },
      { name: 'Eldritch Orb of Annulment', chance: null },
      { name: 'Eldritch Exalted Orb', chance: null },
      { name: 'Ravenous Passion', chance: null },
      { name: 'Gluttony Support', chance: null, variant: '1' },
      { name: 'Auspicious Ambitions', chance: null }
    ]
  },
  {
    id: 'uber-shaper',
    name: 'Uber Shaper',
    tier: 'uber',
    entry: [{ name: 'Cosmic Fragment', qty: 4 }],
    runSeconds: 300,
    source: { label: 'poe.how community runs (3.29)', url: POE_HOW + 'uber-shaper', kills: 50, note: 'Small sample: treat rare drops as rough.' },
    drops: [
      { name: 'Sublime Vision', chance: 0.06 },
      { name: 'The Tides of Time', chance: 0.12 },
      { name: "Shaper's Exalted Orb", chance: 0.18 },
      { name: 'Fragment of Shape', chance: 0.48 },
      { name: 'Fragment of Knowledge', chance: 0.52 },
      { name: 'Orb of Dominance', chance: 0.02 },
      { name: 'Entropic Devastation', chance: 0.28 },
      { name: 'Echoes of Creation', chance: 0.4 },
      { name: 'Cosmic Reliquary Key', chance: null },
      { name: 'Starforge', chance: null },
      { name: 'Templar Astrolabe', chance: null },
      { name: 'Fungal Astrolabe', chance: null },
      { name: 'Voidstorm Support', chance: null, variant: '1' },
      { name: 'The Unblinking Eye', chance: null }
    ]
  },
  {
    id: 'uber-cortex',
    name: 'Uber Venarius',
    tier: 'uber',
    entry: [{ name: 'Synthesising Fragment', qty: 4 }],
    runSeconds: 240,
    source: { label: 'community wiki via poedb', url: POEDB + 'Venarius', kills: null, note: 'Wiki figures with no stated sample.' },
    drops: [
      { name: 'Rational Doctrine', chance: 0.05 },
      { name: 'Forgotten Reliquary Key', chance: 0.015 },
      { name: 'The Apostate', chance: 0.15 },
      { name: 'The Hook', chance: 0.03 },
      { name: 'Nebulis', chance: 0.40 },
      { name: 'Imperfect Memories', chance: null },
      { name: 'Circle of Ambition', chance: 0.10 },
      { name: 'Mask of the Tribunal', chance: 0.30 },
      { name: 'Greater Kinetic Instability Support', chance: null, variant: '1' }
    ]
  },
  {
    id: 'uber-incarnation-of-fear',
    name: 'Uber Incarnation of Fear',
    tier: 'uber',
    entry: [{ name: 'Traumatic Fragment', qty: 4 }],
    runSeconds: 240,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'uber-incarnation-of-fear', kills: null },
    drops: [
      { name: 'The Caged Mammoth', chance: null },
      { name: 'The Unseen Hue', chance: null },
      { name: 'Coiling Whisper', chance: null },
      { name: 'Woespike', chance: null },
      { name: 'Wing of the Wyvern', chance: null },
      { name: 'Bound By Destiny', chance: null },
      { name: 'Orb of Intention', chance: null },
      { name: 'Traumatic Reliquary Key', chance: null },
      { name: 'Greater Devour Support', chance: null, variant: '1' },
      { name: 'Runic Astrolabe', chance: null },
      { name: 'Chaotic Astrolabe', chance: null },
      { name: 'Templar Astrolabe', chance: null },
      { name: 'Timeless Astrolabe', chance: null },
      { name: 'Nameless Astrolabe', chance: null },
      { name: 'Fungal Astrolabe', chance: null },
      { name: 'Fruiting Astrolabe', chance: null },
      { name: 'Lightless Astrolabe', chance: null },
      { name: 'Grasping Astrolabe', chance: null }
    ]
  },
  {
    id: 'uber-incarnation-of-neglect',
    name: 'Uber Incarnation of Neglect',
    tier: 'uber',
    entry: [{ name: 'Lonely Fragment', qty: 4 }],
    runSeconds: 240,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'uber-incarnation-of-neglect', kills: null },
    drops: [
      { name: 'Haunting Memories', chance: null },
      { name: 'Bitter Instinct', chance: null },
      { name: 'Refuge in Isolation', chance: null },
      { name: 'Festering Resentment', chance: null },
      { name: 'Bound By Destiny', chance: null },
      { name: 'Orb of Remembrance', chance: null },
      { name: 'Monochrome', chance: null },
      { name: 'Lonely Reliquary Key', chance: null },
      { name: 'Frostmage Support', chance: null, variant: '1' },
      { name: 'Runic Astrolabe', chance: null },
      { name: 'Chaotic Astrolabe', chance: null },
      { name: 'Templar Astrolabe', chance: null },
      { name: 'Timeless Astrolabe', chance: null },
      { name: 'Enshrouded Astrolabe', chance: null },
      { name: 'Fungal Astrolabe', chance: null },
      { name: 'Nameless Astrolabe', chance: null },
      { name: 'Fruiting Astrolabe', chance: null },
      { name: 'Lightless Astrolabe', chance: null },
      { name: 'Grasping Astrolabe', chance: null }
    ]
  },
  {
    id: 'uber-incarnation-of-dread',
    name: 'Uber Incarnation of Dread',
    tier: 'uber',
    entry: [{ name: 'Reverent Fragment', qty: 4 }],
    runSeconds: 240,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'uber-incarnation-of-dread', kills: null },
    drops: [
      { name: 'Whispers of Infinity', chance: null },
      { name: 'The Hallowed Monarch', chance: null },
      { name: 'Wellwater Phylactery', chance: null },
      { name: 'The Golden Charlatan', chance: null },
      { name: 'Bound By Destiny', chance: null },
      { name: 'Orb of Unravelling', chance: null },
      { name: 'Reverent Reliquary Key', chance: null },
      { name: 'Congregation Support', chance: null, variant: '1' },
      { name: 'Runic Astrolabe', chance: null },
      { name: 'Chaotic Astrolabe', chance: null },
      { name: 'Templar Astrolabe', chance: null },
      { name: 'Timeless Astrolabe', chance: null },
      { name: 'Enshrouded Astrolabe', chance: null },
      { name: 'Fungal Astrolabe', chance: null },
      { name: 'Nameless Astrolabe', chance: null },
      { name: 'Fruiting Astrolabe', chance: null },
      { name: 'Lightless Astrolabe', chance: null },
      { name: 'Grasping Astrolabe', chance: null }
    ]
  },
  {
    id: 'maven',
    name: 'The Maven',
    tier: 'pinnacle',
    entry: [{ name: "The Maven's Writ", qty: 1 }],
    runSeconds: 240,
    source: { label: 'poe.how community runs (3.29)', url: POE_HOW + 'maven', kills: 100, note: 'Small sample: treat rare drops as rough.' },
    drops: [
      { name: 'Orb of Conflict', chance: 0.33 },
      { name: 'Echoforge', chance: 0.01 },
      { name: 'Doppelgänger Guise', chance: 0.04 },
      { name: "Graven's Secret", chance: null },
      { name: 'Legacy of Fury', chance: 0.38 },
      { name: "Arn's Anguish", chance: null },
      { name: "Olesya's Delight", chance: null },
      { name: 'Invert the Rules Support', chance: 0.07, variant: '1' },
      { name: 'Auspicious Ambitions', chance: null }
    ]
  },
  {
    id: 'eater',
    name: 'The Eater of Worlds',
    tier: 'pinnacle',
    entry: [{ name: 'Screaming Invitation', qty: 1 }],
    runSeconds: 210,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'the-eater-of-worlds', kills: null },
    drops: [
      { name: 'Forbidden Flesh', chance: null },
      { name: 'Melding of the Flesh', chance: null },
      { name: 'Exceptional Eldritch Ichor', chance: null },
      { name: 'Eldritch Chaos Orb', chance: null },
      { name: 'Eldritch Orb of Annulment', chance: null },
      { name: 'Eldritch Exalted Orb', chance: null },
      { name: 'Inextricable Fate', chance: null },
      { name: 'The Gluttonous Tide', chance: null },
      { name: 'Gluttony Support', chance: null, variant: '1' },
      { name: 'Auspicious Ambitions', chance: null }
    ]
  },
  {
    id: 'exarch',
    name: 'The Searing Exarch',
    tier: 'pinnacle',
    entry: [{ name: 'Incandescent Invitation', qty: 1 }],
    runSeconds: 210,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'searing-exarch', kills: null },
    drops: [
      { name: 'Forbidden Flame', chance: null },
      { name: 'Exceptional Eldritch Ember', chance: null },
      { name: 'Dissolution of the Flesh', chance: null },
      { name: 'Eldritch Chaos Orb', chance: null },
      { name: 'Eldritch Orb of Annulment', chance: null },
      { name: 'Dawnbreaker', chance: null },
      { name: 'Eldritch Exalted Orb', chance: null },
      { name: 'Dawnstrider', chance: null },
      { name: 'Overheat Support', chance: null, variant: '1' },
      { name: 'Auspicious Ambitions', chance: null }
    ]
  },
  {
    id: 'uber-elder',
    name: 'The Uber Elder',
    tier: 'pinnacle',
    entry: [
      { name: 'Fragment of Knowledge', qty: 1 },
      { name: 'Fragment of Shape', qty: 1 },
      { name: 'Fragment of Terror', qty: 1 },
      { name: 'Fragment of Emptiness', qty: 1 }
    ],
    runSeconds: 240,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'uber-elder', kills: null },
    drops: [
      { name: 'Orb of Dominance', chance: null },
      { name: "Watcher's Eye", chance: null },
      { name: 'Indigon', chance: null },
      { name: "Shaper's Exalted Orb", chance: null },
      { name: "Elder's Exalted Orb", chance: null },
      { name: 'Void of the Elements', chance: null },
      { name: 'Auspicious Ambitions', chance: null },
      { name: 'Disintegrator', chance: null },
      { name: 'Void Shockwave Support', chance: null, variant: '1' },
      { name: 'Mark of the Shaper', chance: null },
      { name: 'Mark of the Elder', chance: null },
      { name: 'Voidfletcher', chance: null },
      { name: 'Cooldown Recovery Support', chance: null, variant: '1' }
    ]
  },
  {
    id: 'elder',
    name: 'The Elder',
    tier: 'pinnacle',
    entry: [
      { name: 'Fragment of Enslavement', qty: 1 },
      { name: 'Fragment of Eradication', qty: 1 },
      { name: 'Fragment of Purification', qty: 1 },
      { name: 'Fragment of Constriction', qty: 1 }
    ],
    runSeconds: 240,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'elder', kills: null },
    drops: [
      { name: 'Nebuloch', chance: null },
      { name: 'Cyclopean Coil', chance: null },
      { name: "Blasphemer's Grasp", chance: null },
      { name: 'Hopeshredder', chance: null },
      { name: 'Shimmeron', chance: null },
      { name: 'Impresence', chance: null },
      { name: "Watcher's Eye", chance: null },
      { name: 'Fragment of Terror', chance: null },
      { name: 'Fragment of Emptiness', chance: null },
      { name: 'Orb of Dominance', chance: null },
      { name: "Elder's Exalted Orb", chance: null },
      { name: 'Void of the Elements', chance: null },
      { name: 'Eldritch Blasphemy Support', chance: null, variant: '1' }
    ]
  },
  {
    id: 'shaper',
    name: 'The Shaper',
    tier: 'pinnacle',
    entry: [
      { name: 'Fragment of the Hydra', qty: 1 },
      { name: 'Fragment of the Phoenix', qty: 1 },
      { name: 'Fragment of the Minotaur', qty: 1 },
      { name: 'Fragment of the Chimera', qty: 1 }
    ],
    runSeconds: 240,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'shaper', kills: null },
    drops: [
      { name: 'Dying Sun', chance: null },
      { name: 'Orb of Dominance', chance: null },
      { name: "Shaper's Exalted Orb", chance: null },
      { name: 'Templar Astrolabe', chance: null },
      { name: 'Fragment of Shape', chance: null },
      { name: 'Fragment of Knowledge', chance: null },
      { name: "Shaper's Touch", chance: null },
      { name: 'Voidwalker', chance: null },
      { name: 'Solstice Vigil', chance: null },
      { name: 'Voidstorm Support', chance: null, variant: '1' }
    ]
  },
  {
    id: 'atziri',
    name: 'Atziri',
    tier: 'pinnacle',
    // 3.30: Atziri lives in the Temple of Atzoatl. Sacrifice and Mortal
    // fragments are gone. Any temple has her; poe.ninja's plain finished
    // temple row ("Apex of Atzoatl") stands in for the entry.
    entry: [{ name: 'Apex of Atzoatl', qty: 1 }],
    runSeconds: 180,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'atziri', kills: null, note: 'Entry is a plain finished temple from poe.ninja. The Chronicle opens the whole temple, not only this fight.' },
    drops: [
      { name: "Atziri's Promise", chance: null },
      { name: "Atziri's Step", chance: null },
      { name: "Doryani's Catalyst", chance: null },
      { name: "Doryani's Invitation", chance: null },
      { name: 'Pledge of Hands', chance: null },
      { name: 'Triumvirate Authority', chance: null },
      // 3.30: Royal Visage in level 81+ temples. The patch notes also give a
      // Soul Core in level 80+ temples without naming which; Intellect, Might
      // and Finesse are named only for Cradle of Creation temples (Uber).
      { name: 'Royal Visage', chance: null }
    ]
  },
  {
    id: 'sirus',
    name: 'Sirus',
    tier: 'pinnacle',
    entry: [
      { name: "Al-Hezmin's Crest", qty: 1 },
      { name: "Baran's Crest", qty: 1 },
      { name: "Drox's Crest", qty: 1 },
      { name: "Veritania's Crest", qty: 1 }
    ],
    runSeconds: 180,
    source: { label: 'community wiki via poedb', url: POEDB + 'Sirus%2C_Awakener_of_Worlds', kills: null, note: 'Wiki figures with no stated sample.' },
    drops: [
      { name: 'Hands of the High Templar', chance: 0.40 },
      { name: 'Crown of the Inward Eye', chance: 0.35 },
      { name: 'The Burden of Truth', chance: 0.20 },
      { name: 'Thread of Hope', chance: 0.05 },
      { name: "Awakener's Orb", chance: 0.15 },
      { name: 'Orb of Dominance', chance: 0.10 },
      { name: 'A Fate Worse Than Death', chance: 0.04 },
      { name: 'Annihilation Support', chance: null, variant: '1' }
    ]
  },
  {
    id: 'venarius',
    name: 'Venarius',
    tier: 'pinnacle',
    entry: [{ name: 'Cortex', qty: 1 }],
    runSeconds: 180,
    source: { label: 'community wiki via poedb', url: POEDB + 'Venarius', kills: null, note: 'Wiki figures with no stated sample.' },
    drops: [
      { name: 'Offering to the Serpent', chance: 0.45 },
      { name: 'Perepiteia', chance: 0.35 },
      { name: 'Garb of the Ephemeral', chance: 0.15 },
      { name: 'Bottled Faith', chance: 0.05 },
      { name: 'The Hook', chance: 0.03 },
      { name: 'Greater Kinetic Instability Support', chance: null, variant: '1' },
      { name: 'Imperfect Memories', chance: null }
    ]
  },
  {
    id: 'infinite-hunger',
    name: 'The Infinite Hunger',
    tier: 'pinnacle',
    entry: [{ name: 'Writhing Invitation', qty: 1 }],
    runSeconds: 180,
    source: { label: 'poedb drop list, no rates yet', url: POEDB + 'The_Infinite_Hunger', kills: null },
    drops: [
      { name: 'Ceaseless Feast', chance: null },
      { name: 'Black Zenith', chance: null },
      { name: 'Choking Guilt', chance: null },
      { name: 'The Eternal Struggle', chance: null },
      { name: 'Grand Eldritch Ichor', chance: null },
      { name: 'Greater Eldritch Ichor', chance: null },
      { name: 'Eldritch Exalted Orb', chance: null },
      { name: 'Eldritch Chaos Orb', chance: null },
      { name: 'Eldritch Orb of Annulment', chance: null }
    ]
  },
  {
    id: 'black-star',
    name: 'The Black Star',
    tier: 'pinnacle',
    entry: [{ name: 'Polaric Invitation', qty: 1 }],
    runSeconds: 180,
    source: { label: 'poedb drop list, no rates yet', url: POEDB + 'The_Black_Star', kills: null },
    drops: [
      { name: 'Polaric Devastation', chance: null },
      { name: 'Sudden Dawn', chance: null },
      { name: 'The Eternal Struggle', chance: null },
      { name: 'Grand Eldritch Ember', chance: null },
      { name: 'Greater Eldritch Ember', chance: null },
      { name: 'Eldritch Exalted Orb', chance: null },
      { name: 'Eldritch Chaos Orb', chance: null },
      { name: 'Eldritch Orb of Annulment', chance: null }
    ]
  },
  {
    id: 'saresh',
    name: 'Saresh, of the Weeping Black',
    tier: 'pinnacle',
    entry: [{ name: 'The Black Barya', qty: 1 }],
    runSeconds: 180,
    source: { label: 'community wiki via poedb', url: POEDB + 'Saresh%2C_of_the_Weeping_Black', kills: null, note: 'Wiki figures with no stated sample.' },
    drops: [
      { name: 'Screams of the Desiccated', chance: 0.50 },
      { name: 'The Broken Elegy', chance: 0.40 },
      { name: 'The Sands of Time', chance: 0.10 },
      { name: 'Transfusion Support', chance: 0.10, variant: '1' }
    ]
  },
  {
    id: 'king-in-the-mists',
    name: 'The King in the Mists',
    tier: 'pinnacle',
    entry: [{ name: 'An Audience With The King', qty: 1 }],
    runSeconds: 180,
    source: { label: 'poedb drop list, no rates yet', url: POEDB + 'The_King_in_the_Mists', kills: null },
    drops: [
      { name: 'The Light of Meaning', chance: null },
      { name: 'The Untouched Soul', chance: null },
      { name: 'Pragmatism', chance: null },
      { name: 'Hexpass Support', chance: null, variant: '1' },
      { name: 'Hextoad Support', chance: null, variant: '1' },
      { name: 'The Burden of Shadows', chance: null },
      { name: 'The Endless Darkness', chance: null }
    ]
  },
  {
    id: 'catarina',
    name: 'Catarina, Master of Undeath',
    tier: 'pinnacle',
    // The Syndicate Mastermind fight, opened with a Syndicate Medallion.
    entry: [{ name: 'Syndicate Medallion', qty: 1 }],
    runSeconds: 180,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'catarina-the-mastermind', kills: null },
    drops: [
      { name: 'Veiled Exalted Orb', chance: null },
      { name: 'Cinderswallow Urn', chance: null },
      { name: 'Bitterbind Point', chance: null },
      { name: 'Cane of Kulemak', chance: null },
      { name: 'Spinehail', chance: null },
      { name: "The Queen's Hunger", chance: null },
      { name: 'The Devouring Diadem', chance: null },
      { name: 'Communion Support', chance: null, variant: '1' },
      { name: "Zorath's Eye of the Endless", chance: null },
      { name: 'Allflame Ember of Kulemak', chance: null },
      { name: 'Allflame Ember of Resplendence', chance: null },
      { name: 'Allflame Ember of Propagation', chance: null },
      { name: "Keeper's Corruption", chance: null },
      { name: "Nook's Crown", chance: null }
    ]
  },
  {
    id: 'incarnation-of-fear',
    name: 'Incarnation of Fear',
    tier: 'pinnacle',
    entry: [{ name: 'Echo of Trauma', qty: 1 }],
    runSeconds: 180,
    source: { label: 'poe.how community runs (3.29)', url: POE_HOW + 'incarnation-of-fear', kills: 2439, note: 'Drops not seen in the sample have no rate.' },
    drops: [
      { name: "Enmity's Embrace", chance: 0.1193 },
      { name: 'Servant of Decay', chance: 0.0248 },
      { name: 'Orb of Intention', chance: 0.0258 },
      { name: 'Bound By Destiny', chance: 0.0052 },
      { name: 'Starcaller', chance: 0.0005 },
      { name: 'Greater Devour Support', chance: 0.0041, variant: '1' },
      { name: 'Chaotic Astrolabe', chance: 0.0077 },
      { name: 'Lightless Astrolabe', chance: 0.0041 },
      { name: 'Fruiting Astrolabe', chance: 0.0031 },
      { name: 'Runic Astrolabe', chance: 0.0026 },
      { name: 'Grasping Astrolabe', chance: 0.0021 },
      { name: 'The Unseen Hue', chance: null },
      { name: 'Coiling Whisper', chance: null },
      { name: 'Traumatic Reliquary Key', chance: null },
      { name: 'Templar Astrolabe', chance: null },
      { name: 'Timeless Astrolabe', chance: null },
      { name: 'Nameless Astrolabe', chance: null },
      { name: 'Fungal Astrolabe', chance: null }
    ]
  },
  {
    id: 'incarnation-of-neglect',
    name: 'Incarnation of Neglect',
    tier: 'pinnacle',
    entry: [{ name: 'Echo of Loneliness', qty: 1 }],
    runSeconds: 180,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'incarnation-of-neglect', kills: null },
    drops: [
      { name: "Betrayal's Sting", chance: null },
      { name: "The Arkhon's Tools", chance: null },
      { name: "Venarius' Astrolabe", chance: null },
      { name: 'Legacy of the Rose', chance: null },
      { name: 'Bound By Destiny', chance: null },
      { name: 'Orb of Remembrance', chance: null },
      { name: 'Monochrome', chance: null },
      { name: 'Frostmage Support', chance: null, variant: '1' },
      { name: 'Runic Astrolabe', chance: null },
      { name: 'Chaotic Astrolabe', chance: null },
      { name: 'Templar Astrolabe', chance: null },
      { name: 'Timeless Astrolabe', chance: null },
      { name: 'Nameless Astrolabe', chance: null },
      { name: 'Fungal Astrolabe', chance: null },
      { name: 'Fruiting Astrolabe', chance: null },
      { name: 'Lightless Astrolabe', chance: null },
      { name: 'Grasping Astrolabe', chance: null }
    ]
  },
  {
    id: 'incarnation-of-dread',
    name: 'Incarnation of Dread',
    tier: 'pinnacle',
    entry: [{ name: 'Echo of Reverence', qty: 1 }],
    runSeconds: 180,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'incarnation-of-dread', kills: null },
    drops: [
      { name: 'The Dark Monarch', chance: null },
      { name: 'Seven Teachings', chance: null },
      { name: 'Wine of the Prophet', chance: null },
      { name: 'Bonemeld', chance: null },
      { name: 'Bound By Destiny', chance: null },
      { name: 'Orb of Unravelling', chance: null },
      { name: 'Congregation Support', chance: null, variant: '1' },
      { name: 'Runic Astrolabe', chance: null },
      { name: 'Chaotic Astrolabe', chance: null },
      { name: 'Templar Astrolabe', chance: null },
      { name: 'Timeless Astrolabe', chance: null },
      { name: 'Nameless Astrolabe', chance: null },
      { name: 'Fungal Astrolabe', chance: null },
      { name: 'Fruiting Astrolabe', chance: null },
      { name: 'Lightless Astrolabe', chance: null },
      { name: 'Grasping Astrolabe', chance: null }
    ]
  },
  {
    id: 'oshabi',
    name: 'Oshabi, Avatar of the Grove',
    tier: 'pinnacle',
    entry: [{ name: 'Sacred Blossom', qty: 1 }],
    runSeconds: 180,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'oshabi', kills: null },
    drops: [
      { name: 'Forbidden Shako', chance: null },
      { name: 'Abhorrent Interrogation', chance: null },
      { name: 'Law of the Wilds', chance: null },
      { name: "Witchhunter's Judgment", chance: null },
      { name: 'Sacred Crystallised Lifeforce', chance: null },
      { name: 'The Aspirant', chance: null },
      { name: 'The Bitter Blossom', chance: null },
      { name: 'Pacifism Support', chance: null, variant: '1' },
      { name: 'Greater Unleash Support', chance: null, variant: '1' }
    ]
  },
  {
    id: 'hive-colony',
    name: 'The Hive Colony',
    tier: 'pinnacle',
    entry: [{ name: 'Hivebrain Gland', qty: 1 }],
    runSeconds: 180,
    source: { label: 'poe.how community runs (3.29)', url: POE_HOW + 'hive-colony', kills: 10, note: 'Tiny sample: treat every rate as rough.' },
    drops: [
      { name: 'Hand of the Lords', chance: 0.2 },
      { name: 'The Will of Esh', chance: 0.2 },
      { name: 'The Will of Tul', chance: 0.2 },
      { name: 'The Will of Xoph', chance: 0.2 },
      { name: 'The Will of Uul-Netol', chance: 0.1 },
      { name: 'The Sundered Will', chance: 0.1 },
      { name: "Uul-Netol's Vow", chance: null },
      { name: 'The Grey Wind', chance: null },
      { name: 'Foulgrasp Support', chance: null, variant: '1' },
      { name: 'Hiveborn Support', chance: null, variant: '1' }
    ]
  },
  {
    id: 'zorath',
    name: 'Zorath',
    tier: 'pinnacle',
    entry: [
      { name: "Zorath's Eye of Malevolence", qty: 2 },
      { name: "Zorath's Eye of the Inevitable", qty: 1 },
      { name: "Zorath's Eye of the Endless", qty: 1 }
    ],
    runSeconds: 180,
    source: { label: 'poe.how community runs (3.29)', url: POE_HOW + 'zorath', kills: 208 },
    drops: [
      { name: 'Subsume the Source', chance: 0.4038 },
      { name: 'Spinesnatch', chance: 0.1779 },
      { name: 'Festering Vengeance', chance: 0.1202 },
      { name: 'Baleful Dominion', chance: 0.1106 },
      { name: 'Destructive Aspiration', chance: 0.0962 },
      { name: 'Extinguishing Grasp', chance: 0.0913 },
      { name: 'Crystalfall Support', chance: 0.1202, variant: '1' }
    ]
  },
  {
    id: 'sasan',
    name: 'Sasan, the Bandit Lord',
    tier: 'pinnacle',
    entry: [],
    runSeconds: 180,
    source: { label: 'poedb drop list, no rates yet', url: POEDB + 'Sasan%2C_the_Bandit_Lord', kills: null },
    drops: [{ name: 'The Living Blade', chance: null }]
  },
  {
    id: 'black-knight',
    name: 'The Black Knight',
    tier: 'pinnacle',
    entry: [],
    runSeconds: 180,
    source: { label: 'poedb drop list, no rates yet', url: POEDB + 'The_Black_Knight', kills: null },
    drops: [{ name: 'Svalinn', chance: null }]
  },
  {
    id: 'lazeth',
    name: 'Lazeth, the Cyaxan Assassin',
    tier: 'pinnacle',
    entry: [],
    runSeconds: 180,
    source: null,
    drops: []
  },
  {
    id: 'feared',
    name: 'The Feared',
    tier: 'pinnacle',
    entry: [{ name: 'Maven\'s Invitation: The Feared', qty: 1 }],
    runSeconds: 300,
    source: null,
    drops: []
  }
] as Boss[]).map(b => ({
  ...b,
  drops: b.drops.map(d => ({ ...d, variable: d.variable ?? VARIABLE_ITEMS.has(d.name) }))
}))
