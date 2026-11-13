// Covens of Umbra (3.30): Wickerman trophies, the boss body parts slotted into
// the Wickerman's head, torso, upper and lower limb. Names from poedb's Covens
// page (2026-11-13). Slots there are known for a few; the rest go by the body
// part the name says, and anything unclear sits under "Other" until a real
// item copy shows its slot.

export type TrophySlot = 'Head' | 'Torso' | 'Upper Limb' | 'Lower Limb' | 'Other'
export const TROPHY_SLOTS: readonly TrophySlot[] = ['Head', 'Torso', 'Upper Limb', 'Lower Limb', 'Other']

// Slots poedb shows.
const KNOWN_SLOT: Record<string, TrophySlot> = {
  "Maven's Orrery": 'Torso',
  "Sirus' Head": 'Head',
  "Incarnation of Dread's Head": 'Head',
  "Incarnation of Neglect's Cube": 'Upper Limb',
  "Incarnation of Fear's Head": 'Head',
  "Searing Exarch's Descry": 'Torso',
  "Eater of Worlds' Head": 'Head',
  "Elder's Head": 'Head',
  "Shaper's Head": 'Head',
  "Venarius' Scripture": 'Upper Limb'
}

const BY_WORD: Array<[RegExp, TrophySlot]> = [
  [/\b(Head|Skull|Crown|Mask|Helm|Hood|Visage|Horn|Tricorne)$/, 'Head'],
  [/\b(Torso|Ribcage|Breastplate|Carapace|Heart|Stomach|Lungs|Gut)$/, 'Torso'],
  [/\b(Arm|Hand|Fist|Claws?|Tentacle|Talon|Scythe-hand)$/, 'Upper Limb'],
  [/\b(Leg|Foot|Haunches|Tail|Hoof)$/, 'Lower Limb']
]

export function trophySlot (name: string): TrophySlot {
  const known = KNOWN_SLOT[name]
  if (known) return known
  for (const [re, slot] of BY_WORD) if (re.test(name)) return slot
  return 'Other'
}

export const TROPHIES: readonly string[] = [
  ...Object.keys(KNOWN_SLOT),
  'Scorched Arm', 'Severed Rhoa Head', "Sea Witch's Tentacle", "Crustacean's Claw", 'Totemic Visage',
  "Skeletal Archer's Arm", "Skeletal Warrior's Leg", "Warden's Arm", "Goatman's Horn", "Mariner's Tricorne",
  'Elemental Essence', 'Galvanic Tentacle', "Siren's Tentacle", "Cutthroat's Head", 'Golemic Stone',
  'Gargantuan Claws', 'Hollowed Skull', "Bonestalker's Ribcage", 'Templar Skull', 'Arachnid Fangs',
  'Severed Stinger', "Bandit Rogue's Head", "Poacher's Leg", 'Cobra Tail', "Bandit Witch's Head",
  'Arachnid Leg', 'Vaal Appendage', "Bandit Warrior's Head", 'Primate Foot', 'Ursine Flesh',
  'Artificial Appendage', 'Severed Scythe-hand', "Captain's Leg", 'Spined Claws', 'Molten Core',
  'Defaced Bust', 'Spectral Hood', "Soldier's Head", 'Flaming Ribbon', 'Statue Leg',
  "Voidbearer's Leg", 'Voltaic Apparatus', "General's Head", "Brute's Arm", "Thaumaturge's Head",
  'Spiked Carapace', 'Skeletal Beast Leg', "Scholar's Arm", "Aristocrat's Torso", "Despot's Fist",
  "Vulture's Gut", 'Templar Banner', 'Pocked Leg', 'Pocked Arm', 'Flesh-fused Lantern',
  'Carved Haunches', 'Blazing Skull', "Gladiator's Heart", "Swordmaster's Blade", 'Chitinous Leg',
  'Engorged Eye', 'Corrupted Carapace', 'Vendigo Claws', "Overseer's Whip", "Justicar's Helm",
  'Flaming Furnace', "Adherent's Crown", 'Heretical Tome', 'Hallowed Descry', 'Skeletal Tail',
  "Scholar's Leg", 'Ravenous Skull', "Noble's Head", 'Conjoined Hound Head', "Scout's Bow",
  "Ancestor's Club", 'Skeleton Wheel', 'Osseous Talon', 'Flayed Visage', 'Bear Head',
  'Boar Head', 'Stag Head', 'Arachnid Egg Sac', 'Infested Torso', "King Crab's Claw",
  'Calcified Leg', 'Wraith Claws', 'Infected Leg', "Inquisitor's Claw", "Necromancer's Mask",
  'Ornate Torso', "Devourer's Antenna", 'Blackened Lungs', "Construct's Head", "Spider Queen's Head",
  'Dessicated Head', "Hag's Stomach", 'Ghostly Claw', 'Terrifying Maw', 'Armoured Leg',
  "Blackguard's Leg", "Champion's Banner", 'Lunar Bow', 'Golden Ankh', 'Gemling Torso',
  "Scarecrow's Pitchfork", 'Charred Leg', 'Sun-bleached Breastplate', 'Resplendent Sceptre', 'Solar Shield',
  'Crescent Blade', "Smuggler's Hand", 'Coagulated Essence', 'Gelid Fangs', 'Desert Sword',
  'Scorpion Stinger', 'Lithic Haunches', 'Chimeral Eye', "Chaos Golem's Core", "Desert Queen's Crown",
  'Voltaic Skull', 'Flayed Arm', "Inquisitor's Head", "Witch's Head", "Hag's Head",
  'Diseased Wing', 'Bloodied Arm', 'Prosthetic Leg', 'Distended Stomach', 'Smouldering Leg',
  'Broken Bust', 'Osseous Scythe', 'Flaming Goat Hoof', "Minotaur's Head", "Hydra's Head",
  "Chimera's Head", "Phoenix's Head", "Constrictor's Head", "Purifier's Head", "Enslaver's Head",
  "Eradicator's Head", "Baran's Head", "Veritania's Head", "Drox's Head", "Al-Hezmin's Head",
  "Pit Fighter's Helm", "Lion's Claws", "Bat's Wings", 'Nightmarish Book of Depravity', 'Nightmarish Head of Uhtred',
  'Nightmarish Core of the Unbreakable', 'Nightmarish Wings of Lycia', 'Nightmarish Wings of Catarina', "Coven Queen's Crown"
]

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Matches the trophies of one slot by exact name, whatever poe.ninja files them under. */
export function slotMatcher (slot: TrophySlot): RegExp {
  const names = TROPHIES.filter(n => trophySlot(n) === slot)
  return new RegExp(`^(${names.map(escape).join('|')})$`)
}
