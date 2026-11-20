// Estimated drop chances for drops with no measured rate, as percentages.
//
// From Path of Kalandra's wiki-based drop tables (read 2026-11-05, Allflame),
// not measured kills, so the viewer marks them as estimates. Where measured
// rates exist they land close, but treat these as rough. Measured rates and
// the player's own kill log always win.

export const ESTIMATE_SOURCE_LABEL = 'Path of Kalandra, wiki-based estimates'
const ESTIMATE_URL = 'https://www.pathofkalandra.com/boss/'

const SLUGS: Record<string, string> = {
  'uber-maven': 'uber-maven',
  'uber-sirus': 'uber-sirus',
  'uber-uber-elder': 'uber-uber-elder',
  'uber-atziri': 'uber-atziri',
  'uber-exarch': 'uber-searing-exarch',
  'uber-eater': 'uber-eater-of-worlds',
  'uber-shaper': 'uber-shaper',
  'uber-cortex': 'uber-venarius',
  'maven': 'the-maven',
  'eater': 'the-eater-of-worlds',
  'exarch': 'the-searing-exarch',
  'uber-elder': 'uber-elder',
  'shaper': 'the-shaper',
  'atziri': 'atziri-queen-of-the-vaal',
  'sirus': 'sirus-awakener-of-worlds',
  'venarius': 'venarius',
  'infinite-hunger': 'the-infinite-hunger',
  'black-star': 'the-black-star',
  'king-in-the-mists': 'the-king-in-the-mists',
  'catarina': 'catarina-master-of-undeath',
  'elder': 'the-elder',
  'incarnation-of-neglect': 'incarnation-of-neglect',
  'incarnation-of-dread': 'incarnation-of-dread',
  'uber-incarnation-of-fear': 'uber-incarnation-of-fear',
  'uber-incarnation-of-neglect': 'uber-incarnation-of-neglect',
  'uber-incarnation-of-dread': 'uber-incarnation-of-dread',
  'oshabi': 'oshabi-avatar-of-the-grove'
}

export function estimateUrl (bossId: string): string | null {
  return SLUGS[bossId] ? ESTIMATE_URL + SLUGS[bossId] : null
}

export const ESTIMATED_RATES: Record<string, Record<string, number>> = {
  'uber-maven': {
    'Auspicious Ambitions': 0.5
  },
  'uber-uber-elder': {
    'Voidforge': 1.5,
    'Sublime Vision': 1.5,
    'Orb of Dominance': 6,
    'Decaying Reliquary Key': 1.5,
    'Soul Ascension': 9,
    "Watcher's Eye": 35,
    "Shaper's Exalted Orb": 13,
    "Elder's Exalted Orb": 13,
    'Void of the Elements': 1,
    'The Eternity Shroud': 5,
    'Void Shockwave Support': 10,
    'Call of the Void': 46,
    'Impresence': 10,
    'Curio of Decay': 5,
    'The Devourer of Minds': 28.5,
    'Auspicious Ambitions': 0.5,
    'Cooldown Recovery Support': 2
  },
  'uber-atziri': {
    "Atziri's Disfavour": 2,
    'The Price of Devotion': 0.1,
    'Triskaidekaphobia': 20,
    'Greater Spell Echo Support': 5,
    'Vaal Sacrifice Support': 8
  },
  'uber-exarch': {
    'The Celestial Brace': 1.5,
    'Forbidden Flame': 5,
    'Archive Reliquary Key': 1.5,
    'Exceptional Eldritch Ember': 15,
    'Curio of Absorption': 5,
    "Annihilation's Approach": 29,
    'Eldritch Chaos Orb': 5,
    'Eldritch Orb of Annulment': 5,
    'The Annihilating Light': 45.5,
    'Crystallised Omniscience': 24,
    'Eldritch Exalted Orb': 5,
    'Overheat Support': 10,
    'Auspicious Ambitions': 0.5
  },
  'uber-eater': {
    'Nimis': 2,
    'Forbidden Flesh': 5,
    'Visceral Reliquary Key': 1,
    'Exceptional Eldritch Ichor': 15,
    'Curio of Consumption': 5,
    'Ashes of the Stars': 30,
    'Eldritch Chaos Orb': 5,
    'Eldritch Orb of Annulment': 5,
    'Eldritch Exalted Orb': 5,
    'Ravenous Passion': 68,
    'Gluttony Support': 10,
    'Auspicious Ambitions': 0.5
  },
  'uber-shaper': {
    'Cosmic Reliquary Key': 1,
    'Starforge': 2,
    'Voidstorm Support': 10,
    'The Unblinking Eye': 19
  },
  'uber-cortex': {
    'Imperfect Memories': 0.5,
    'Greater Kinetic Instability Support': 10
  },
  'maven': {
    "Graven's Secret": 17,
    "Arn's Anguish": 17,
    "Olesya's Delight": 17,
    'Auspicious Ambitions': 0.5
  },
  'eater': {
    'Forbidden Flesh': 5,
    'Melding of the Flesh': 2,
    'Exceptional Eldritch Ichor': 15,
    'Eldritch Chaos Orb': 5,
    'Eldritch Orb of Annulment': 5,
    'Eldritch Exalted Orb': 5,
    'Inextricable Fate': 55,
    'The Gluttonous Tide': 43,
    'Gluttony Support': 10,
    'Auspicious Ambitions': 0.5
  },
  'exarch': {
    'Forbidden Flame': 5,
    'Exceptional Eldritch Ember': 15,
    'Dissolution of the Flesh': 2,
    'Eldritch Chaos Orb': 5,
    'Eldritch Orb of Annulment': 5,
    'Dawnbreaker': 63,
    'Eldritch Exalted Orb': 5,
    'Dawnstrider': 35,
    'Overheat Support': 10,
    'Auspicious Ambitions': 0.5
  },
  'uber-elder': {
    'Orb of Dominance': 6,
    "Watcher's Eye": 35,
    'Indigon': 8,
    "Shaper's Exalted Orb": 13,
    "Elder's Exalted Orb": 13,
    'Void of the Elements': 1,
    'Auspicious Ambitions': 0.5,
    'Disintegrator': 2,
    'Void Shockwave Support': 10,
    'Mark of the Shaper': 35,
    'Mark of the Elder': 35,
    'Voidfletcher': 20,
    'Cooldown Recovery Support': 2
  },
  'shaper': {
    'Dying Sun': 3,
    'Orb of Dominance': 3,
    "Shaper's Exalted Orb": 13,
    'Fragment of Shape': 50,
    'Fragment of Knowledge': 50,
    "Shaper's Touch": 56,
    'Voidwalker': 30,
    'Solstice Vigil': 11,
    'Voidstorm Support': 10
  },
  'atziri': {
    "Atziri's Promise": 48,
    "Atziri's Step": 15,
    "Doryani's Catalyst": 3,
    "Doryani's Invitation": 15,
    'Pledge of Hands': 1,
    'Triumvirate Authority': 18
  },
  'sirus': {
    'Annihilation Support': 5
  },
  'venarius': {
    'Greater Kinetic Instability Support': 10,
    'Imperfect Memories': 0.5
  },
  'infinite-hunger': {
    'Ceaseless Feast': 3,
    'Black Zenith': 3,
    'Choking Guilt': 1,
    'The Eternal Struggle': 5,
    'Grand Eldritch Ichor': 12,
    'Greater Eldritch Ichor': 12,
    'Eldritch Exalted Orb': 5,
    'Eldritch Chaos Orb': 5,
    'Eldritch Orb of Annulment': 5
  },
  'black-star': {
    'Polaric Devastation': 3,
    'Sudden Dawn': 3,
    'The Eternal Struggle': 5,
    'Grand Eldritch Ember': 12,
    'Greater Eldritch Ember': 12,
    'Eldritch Exalted Orb': 5,
    'Eldritch Chaos Orb': 5,
    'Eldritch Orb of Annulment': 5
  },
  'king-in-the-mists': {
    'The Light of Meaning': 20,
    'The Untouched Soul': 40,
    'Pragmatism': 35,
    'Hexpass Support': 10,
    'Hextoad Support': 6,
    'The Burden of Shadows': 5,
    'The Endless Darkness': 1
  },
  'catarina': {
    'Cinderswallow Urn': 30,
    'Veiled Exalted Orb': 25,
    'Allflame Ember of Kulemak': 60,
    'Spinehail': 20,
    "Zorath's Eye of the Endless": 50,
    "The Queen's Hunger": 6,
    "Keeper's Corruption": 5,
    'Communion Support': 10,
    'The Devouring Diadem': 16,
    "Nook's Crown": 0.5,
    'Bitterbind Point': 10,
    'Cane of Kulemak': 17
  },
  'elder': {
    "Watcher's Eye": 40,
    'Fragment of Terror': 50,
    'Fragment of Emptiness': 50,
    'Orb of Dominance': 2,
    "Elder's Exalted Orb": 12,
    'Eldritch Blasphemy Support': 10,
    'Cyclopean Coil': 30,
    "Blasphemer's Grasp": 26,
    'Impresence': 20,
    'Nebuloch': 8,
    'Hopeshredder': 8,
    'Shimmeron': 8,
    'Void of the Elements': 0.5
  },
  'incarnation-of-neglect': {
    'Orb of Remembrance': 33,
    "Betrayal's Sting": 50,
    'Bound By Destiny': 10,
    "Venarius' Astrolabe": 10,
    'Chaotic Astrolabe': 7.5,
    'Monochrome': 3,
    'Legacy of the Rose': 2,
    "The Arkhon's Tools": 38,
    'Lightless Astrolabe': 7.5,
    'Nameless Astrolabe': 7.5,
    'Frostmage Support': 5,
    'Fungal Astrolabe': 7.5,
    'Timeless Astrolabe': 7.5,
    'Grasping Astrolabe': 7.5,
    'Runic Astrolabe': 7.5,
    'Templar Astrolabe': 32.5,
    'Fruiting Astrolabe': 7.5
  },
  'incarnation-of-dread': {
    'Congregation Support': 10,
    'Wine of the Prophet': 2,
    'Bound By Destiny': 10,
    'Orb of Unravelling': 33,
    'The Dark Monarch': 35,
    'Chaotic Astrolabe': 7.5,
    'Nameless Astrolabe': 7.5,
    'Bonemeld': 55,
    'Lightless Astrolabe': 7.5,
    'Timeless Astrolabe': 7.5,
    'Fungal Astrolabe': 7.5,
    'Grasping Astrolabe': 7.5,
    'Seven Teachings': 8,
    'Runic Astrolabe': 7.5,
    'Templar Astrolabe': 32.5,
    'Fruiting Astrolabe': 7.5
  },
  'uber-incarnation-of-fear': {
    'Coiling Whisper': 36,
    'Woespike': 2,
    'Bound By Destiny': 10,
    'Chaotic Astrolabe': 7.5,
    'The Caged Mammoth': 60,
    'Lightless Astrolabe': 7.5,
    'Nameless Astrolabe': 7.5,
    'Orb of Intention': 50,
    'Traumatic Reliquary Key': 1,
    'Fungal Astrolabe': 7.5,
    'Greater Devour Support': 5,
    'Timeless Astrolabe': 7.5,
    'Wing of the Wyvern': 2,
    'Grasping Astrolabe': 7.5,
    'Runic Astrolabe': 7.5,
    'Templar Astrolabe': 32.5,
    'Fruiting Astrolabe': 7.5
  },
  'uber-incarnation-of-neglect': {
    'Festering Resentment': 2,
    'Orb of Remembrance': 33,
    'Bound By Destiny': 10,
    'Chaotic Astrolabe': 7.5,
    'Monochrome': 3,
    'Bitter Instinct': 30,
    'Lonely Reliquary Key': 1,
    'Lightless Astrolabe': 7.5,
    'Refuge in Isolation': 55,
    'Nameless Astrolabe': 7.5,
    'Frostmage Support': 5,
    'Fungal Astrolabe': 7.5,
    'Timeless Astrolabe': 7.5,
    'Grasping Astrolabe': 7.5,
    'Haunting Memories': 13,
    'Runic Astrolabe': 7.5,
    'Templar Astrolabe': 32.5,
    'Fruiting Astrolabe': 7.5
  },
  'uber-incarnation-of-dread': {
    'Congregation Support': 10,
    'The Golden Charlatan': 2,
    'Whispers of Infinity': 30,
    'Reverent Reliquary Key': 1,
    'The Hallowed Monarch': 54,
    'Orb of Unravelling': 33,
    'Bound By Destiny': 10,
    'Chaotic Astrolabe': 7.5,
    'Lightless Astrolabe': 7.5,
    'Nameless Astrolabe': 7.5,
    'Fungal Astrolabe': 7.5,
    'Timeless Astrolabe': 7.5,
    'Grasping Astrolabe': 7.5,
    'Wellwater Phylactery': 14,
    'Runic Astrolabe': 7.5,
    'Templar Astrolabe': 32.5,
    'Fruiting Astrolabe': 7.5
  },
  'oshabi': {
    'Forbidden Shako': 50,
    'Sacred Crystallised Lifeforce': 100,
    'The Aspirant': 14,
    'Greater Unleash Support': 10,
    'Abhorrent Interrogation': 12,
    'Pacifism Support': 10,
    "Witchhunter's Judgment": 19,
    'Law of the Wilds': 19
  }
}
