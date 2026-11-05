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
  // Drops unidentified and its poe.ninja variants differ a lot in price
  // (jewel keystone/radius, ascendancy...). Priced by median variant unless
  // the player picks the cheapest one or types a price.
  variable?: boolean
}

// Uniques that drop unidentified with a wide price spread between variants.
export const VARIABLE_ITEMS = new Set([
  'Impossible Escape',
  'Thread of Hope',
  "Watcher's Eye",
  'Forbidden Flesh',
  'Forbidden Flame',
  'Sublime Vision',
  "Atziri's Splendour",
  "Doryani's Invitation"
])

export interface BossEntry {
  name: string
  qty: number
}

export interface Boss {
  id: string
  name: string
  tier: 'uber' | 'pinnacle'
  entry: BossEntry[]
  // Default fight + travel time in seconds; the player can change it.
  runSeconds: number
  drops: BossDrop[]
  source: DataSource | null
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
    source: { label: 'poe.how community runs (3.29)', url: POE_HOW + 'uber-sirus', kills: 200, note: 'Small sample: treat rare drops as rough.' },
    drops: [
      { name: "Oriath's End", chance: 0.075 },
      { name: 'Orb of Dominance', chance: 0.06 },
      { name: "Awakener's Orb", chance: 0.16 },
      { name: 'Thread of Hope', chance: 0.535 },
      { name: 'The Tempest Rising', chance: 0.42 },
      { name: 'A Fate Worse Than Death', chance: 0.05 },
      { name: 'Annihilation Support', chance: 0.09, variant: '1' },
      { name: 'Oubliette Reliquary Key', chance: 0.01 },
      { name: 'The Saviour', chance: null }
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
      { name: 'Auspicious Ambitions', chance: null }
    ]
  },
  {
    id: 'uber-atziri',
    name: 'Uber Atziri',
    tier: 'uber',
    entry: [
      { name: 'Mortal Hope', qty: 1 },
      { name: 'Mortal Grief', qty: 1 },
      { name: 'Mortal Rage', qty: 1 },
      { name: 'Mortal Ignorance', qty: 1 }
    ],
    runSeconds: 240,
    source: { label: 'poe.how community runs (3.29)', url: POE_HOW + 'uber-atziri', kills: 60, note: 'Small sample: drops not seen in it have no rate.' },
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
      { name: 'Vaal Sacrifice Support', chance: null, variant: '1' }
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
      { name: 'Overheat Support', chance: null, variant: '1' }
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
      { name: 'Gluttony Support', chance: null, variant: '1' }
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
      { name: 'Voidstorm Support', chance: null, variant: '1' }
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
    id: 'maven',
    name: 'The Maven',
    tier: 'pinnacle',
    entry: [{ name: "The Maven's Writ", qty: 1 }],
    runSeconds: 240,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'maven', kills: null },
    drops: [
      { name: 'Orb of Conflict', chance: null },
      { name: 'Echoforge', chance: null },
      { name: 'Doppelgänger Guise', chance: null },
      { name: "Graven's Secret", chance: null },
      { name: 'Legacy of Fury', chance: null },
      { name: "Arn's Anguish", chance: null },
      { name: "Olesya's Delight", chance: null },
      { name: 'Invert the Rules Support', chance: null, variant: '1' }
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
      { name: 'Overheat Support', chance: null, variant: '1' }
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
      { name: 'Voidfletcher', chance: null }
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
    entry: [
      { name: 'Sacrifice at Dusk', qty: 1 },
      { name: 'Sacrifice at Dawn', qty: 1 },
      { name: 'Sacrifice at Noon', qty: 1 },
      { name: 'Sacrifice at Midnight', qty: 1 }
    ],
    runSeconds: 180,
    source: { label: 'poe.how drop list, no rates yet', url: POE_HOW + 'atziri', kills: null },
    drops: [
      { name: 'Mortal Hope', chance: null },
      { name: 'Mortal Grief', chance: null },
      { name: 'Mortal Rage', chance: null },
      { name: 'Mortal Ignorance', chance: null },
      { name: "Atziri's Promise", chance: null },
      { name: "Atziri's Step", chance: null },
      { name: "Doryani's Catalyst", chance: null },
      { name: "Doryani's Invitation", chance: null },
      { name: 'Pledge of Hands', chance: null },
      { name: 'Triumvirate Authority', chance: null }
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
      { name: 'Greater Kinetic Instability Support', chance: null, variant: '1' }
    ]
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
