// Captured beasts' Bestiary group and family, from the game's monster data
// (poedb monster pages, 2026-11-20). Every group sits in one family. poedb's
// genus field doesn't match the wiki's, so genus is left out.

export type BeastFamily = 'The Wilds' | 'The Sands' | 'The Caverns' | 'The Deep'

export const GROUP_FAMILY: Record<string, BeastFamily> = {
  Amphibians: 'The Deep',
  Arachnids: 'The Caverns',
  Avians: 'The Sands',
  Canines: 'The Wilds',
  Cephalopods: 'The Deep',
  Crustaceans: 'The Deep',
  Felines: 'The Wilds',
  Insects: 'The Caverns',
  Primates: 'The Wilds',
  Reptiles: 'The Sands',
  Unnaturals: 'The Wilds',
  Ursae: 'The Wilds'
}

const GROUP_BEASTS: Record<string, string[]> = {
  Amphibians: [
    'Chimeric Croaker',
    'Chrome-infused Croaker',
    'Chrome-touched Croaker',
    'Craicic Croaker',
    'Craicic Maw',
    'Fetid Maw',
    'Filth Maw',
    'Infested Maw',
    'Vaulting Croaker'
  ],
  Arachnids: [
    "Arakaali's Daughter",
    'Black Scorpion',
    'Brooding Tarantula',
    'Cave Skitterer',
    'Corrupted Arach',
    'Corrupted Spitter',
    'Crypt Ambusher',
    'Crypt Weaver',
    'Devourer',
    'Enraptured Arachnid',
    'Fenumal Devourer',
    'Fenumal Hybrid Arachnid',
    'Fenumal Plagued Arachnid',
    'Fenumal Scorpion',
    'Fenumal Widow',
    'Fenumus, First of the Night',
    'Hatchling',
    'Hybrid Arachnid',
    'Ink Spinner',
    'Leaping Spider',
    'Lurking Venom',
    'Mutant Arach',
    'Noxious Tarantula',
    'Plagued Arachnid',
    'Predatory Scorpion',
    'Sand Scorpion',
    'Scalding Arachnid',
    'Spindle Spider',
    'Sulphuric Scorpion',
    'Vaal Recluse',
    'Virulent Spider',
    'Vivid Abberarach',
    'Webbed Spider'
  ],
  Avians: [
    'Adolescent Rhex',
    'Avian Retch',
    'Bone Rhoa',
    'Corrupted Rhoa',
    'Escaped Rhex',
    'Feral Fowl',
    'Gluttonous Gull',
    'Infested Rhoa',
    'Infested Vulture',
    'Maternal Rhex',
    'Mindless Scavenger',
    'Murk Runner',
    'Rhoa Mare',
    'Rooster Fiend',
    'Rotting Vulture',
    'Saqawal, First of the Sky',
    'Saqawine Retch',
    'Saqawine Rhex',
    'Saqawine Rhoa',
    'Saqawine Vulture',
    'Scavenging Vulture',
    'Talon Archer',
    'Tercel Rhoa',
    'Vivid Vulture',
    'Wild Rhex'
  ],
  Canines: [
    'Arctic Wolf',
    'Farric Magma Hound',
    'Farric Pit Hound',
    'Farric Wolf Alpha',
    'Freezing Wolf',
    'Fury Hound',
    'Pitbull Demon',
    'Primal Rhex Matriarch',
    'Purge Hound',
    'Snow Wolf',
    'Vicious Hound',
    'War Hound'
  ],
  Cephalopods: [
    'Brine Vassal',
    'Cavern Drifter',
    'Craicic Squid',
    'Craicic Vassal',
    'Craicic Watcher',
    'Cursed Spawn',
    "Merveil's Attendant",
    "Merveil's Blessed",
    "Merveil's Chosen",
    "Merveil's Daughter",
    "Merveil's Favoured",
    "Merveil's Retainer",
    'Sewer Drifter',
    'Singing Siren',
    'Slimy Nemesis',
    'Soulless Watcher',
    'Swarthy Mollusc',
    'Venomous Spawn',
    'Vivid Watcher'
  ],
  Crustaceans: [
    'Bleached Crawler',
    'Craiceann, First of the Deep',
    'Craicic Sand Spitter',
    'Craicic Savage Crab',
    'Craicic Shield Crab',
    'Craicic Spider Crab',
    'Crustacean Sniper',
    'Deep Crustacean',
    'Enraptured Crab',
    'Granite Eater',
    'Gravel Eater',
    'Infested Crab',
    'Infested Crawler',
    'Obsidian Eater',
    'Primal Crushclaw',
    'Rock Spitter',
    'Savage Crab',
    'Sewage Crawler',
    'Shield Crab',
    'Sulphurspawn',
    'Toxic Crawler',
    'Waste Lurcher'
  ],
  Felines: [
    'Dune Hellion',
    'Enslaved Hellion',
    'Farric Flame Hellion Alpha',
    'Farric Frost Hellion Alpha',
    'Farric Lynx Alpha',
    'Farric Tiger Alpha',
    'Farrul, First of the Plains',
    'Flame Hellion',
    'Mountain Hellion',
    'Mountain Hellion Alpha',
    'Mountain Lynx',
    'Ruins Hellion',
    'Shackled Hellion',
    'Wild Hellion Alpha'
  ],
  Insects: [
    'Carrion Burrower',
    'Carrion Queen',
    'Carrion Swarmer',
    'Dirt Scrabbler',
    'Dust Scrabbler',
    'Fenumal Queen',
    'Fenumal Scrabbler',
    'Infested Skitterer',
    'Lowlands Hopper',
    'Parasite',
    'Plated Parasite',
    'Ravenous Parasite',
    'Sand Leaper',
    'Sand Skitterer',
    'Scum Crawler',
    'Spitting Parasite',
    'Vicious Parasite'
  ],
  Primates: [
    'Alpine Devil',
    'Alpine Shaman',
    'Barrow Ape',
    'Bearded Devil',
    'Bearded Shaman',
    'Bearded Skycaller',
    'Blood Ape',
    'Blood Chieftain',
    'Carnage Ape',
    'Carnage Chieftain',
    'Colossus Crusher',
    'Dread Primate',
    'Farric Ape',
    'Farric Chieftain',
    'Farric Goatman',
    'Goatman',
    'Goatman Fire-raiser',
    'Goatman Shaman',
    'Goatman Stomper',
    'Hill Devil',
    'Host Chieftain',
    'Infested Ape',
    'Primal Cystcaller',
    'Stygian Ape',
    'Stygian Silverback'
  ],
  Reptiles: [
    'Acid Slitherer',
    'Barb Serpent',
    'Bramble Cobra',
    'Chrome-infused Chimeral',
    'Chrome-touched Chimeral',
    'Feral Chimeral',
    'Glade Mamba',
    'Host Adder',
    'Host Cobra',
    'Infested Serpent',
    'Night Adder',
    'Plumed Chimeral',
    'Sand Serpent',
    'Saqawine Blood Viper',
    'Saqawine Chimeral',
    'Saqawine Cobra',
    'Spine Serpent'
  ],
  Unnaturals: [
    'Avalanche Rider',
    'Black Mórrigan',
    'Chrome-infused Goliath',
    'Chrome-touched Goliath',
    'Farric Goliath',
    'Farric Taurus',
    'Fighting Bull',
    'Grazing Taurus',
    'Porcupine Goliath',
    'Wild Brambleback'
  ],
  Ursae: [
    'Armour Cruncher',
    'Bone Cruncher',
    'Cave Beast',
    'Corrupted Beast',
    'Enraptured Beast',
    'Farric Gargantuan',
    'Farric Ursa',
    'Forest Beast',
    'Hairy Bonecruncher',
    'Infested Tunnelfiend',
    'Infested Ursa',
    'Plummeting Ursa',
    'Shaggy Monstrosity',
    'Skeletal Beast',
    'Thicket Hulk',
    'Tunnelfiend',
    'Wild Bristle Matron',
    'Woods Ursa'
  ]
}

// The game's Bestiary family icons (UIImages/InGame/Bestiary/Icon*), in its order.
export const BEAST_FAMILIES: Array<{ id: BeastFamily, short: string, icon: string }> = [
  { id: 'The Wilds', short: 'Wilds', icon: '/images/bestiary/wilds.png' },
  { id: 'The Sands', short: 'Sands', icon: '/images/bestiary/sands.png' },
  { id: 'The Caverns', short: 'Caverns', icon: '/images/bestiary/caverns.png' },
  { id: 'The Deep', short: 'Deep', icon: '/images/bestiary/deep.png' }
]

export interface BeastKind {
  // "Amphibian"
  group: string
  family: BeastFamily
}

const SINGULAR: Record<string, string> = { Ursae: 'Ursa' }

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

let byName: Map<string, BeastKind> | null = null
function index (): Map<string, BeastKind> {
  if (!byName) {
    byName = new Map()
    for (const [group, names] of Object.entries(GROUP_BEASTS)) {
      const kind: BeastKind = { group: SINGULAR[group] ?? group.replace(/s$/, ''), family: GROUP_FAMILY[group] }
      for (const name of names) byName.set(fold(name), kind)
    }
  }
  return byName
}

export function beastKind (name: string): BeastKind | null {
  return index().get(fold(name)) ?? null
}

// "Amphibian · Deep"
export function beastKindLabel (name: string): string | undefined {
  const k = beastKind(name)
  return k ? `${k.group} · ${k.family.replace(/^The /, '')}` : undefined
}
