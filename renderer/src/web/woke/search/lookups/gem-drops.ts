// Where the gems the campaign never gives come from: endgame bosses for
// exceptional gems, recipes, and gems that no longer drop. Checked against
// poewiki (items.drop_text and the gem pages) in November 2026, game 3.30.
// `sub` is the short line under the search result, `text` the card's lines.

export interface GemDrop {
  sub: string
  text: string[]
  // Exceptional gems only drop once the Originator Voidstone is socketed.
  voidstone?: boolean
}

const boss = (sub: string, ...text: string[]): GemDrop => ({ sub, text, voidstone: true })

const LEGION = 'in the Domain of Timeless Conflict (Legion splinters), or in a Legion encounter in maps'
const NIGHTMARE = 'a Nightmare map'
const ZEALOT = 'Zealot\'s Vault, opened by completing a Shaped Region in the north-east of the Atlas'
const ARKHON = 'Arkhon\'s Vault, opened by completing a Shaped Region in the south-east of the Atlas'
const BEYOND = 'a Beyond demon lord: can spawn from a Beyond portal in maps'

export const GEM_DROPS: Record<string, GemDrop> = {
  'Annihilation Support': boss('Drops from Sirus', 'Drops from Sirus, Awakener of Worlds, normal or Uber.'),
  'Awakened Empower Support': boss('Drops from Uber Maven', 'Drops only from the Uber Maven.'),
  'Awakened Enhance Support': boss('Drops from Uber Maven', 'Drops only from the Uber Maven.'),
  'Awakened Enlighten Support': boss('Drops from Uber Maven', 'Drops only from the Uber Maven.'),
  'Bloodsoaked Banner Support': boss('Drops from Kosis (Simulacrum)', 'Drops from Kosis, The Revelation, the Delirium boss in a Simulacrum.'),
  'Bonespire Support': boss('Drops from Vruun (Breach)', 'Drops from Vruun, Marshal of Xesht, in a stabilised Unstable Breach. A Breach Scarab of the Marshal always spawns him.'),
  'Cast on Ward Break Support': boss('Drops from Nightmare of Uhtred', `Drops from the Nightmare of Uhtred, the boss of the Citadel Map, ${NIGHTMARE}.`),
  'Communion Support': boss('Drops from Catarina', 'Drops from Catarina, Master of Undeath (Syndicate Mastermind), and from the Nightmare of Catarina in the Ziggurat Map, a Nightmare map.'),
  'Companionship Support': boss('Drops from Aukuna (Legion)', `Drops from Aukuna, the Black Sekhema, ${LEGION}.`),
  'Congregation Support': boss('Drops from Incarnation of Dread', 'Drops from the Incarnation of Dread, normal or Uber.'),
  'Cooldown Recovery Support': boss('Found in Arkhon\'s Vault', `Found in the ${ARKHON}.`),
  'Coursing Current Support': { sub: 'No longer drops', text: ['It dropped from Velka, the Tide Witch (Curse of the Allflame). That content did not go core in 3.30, so it is drop disabled for now. Buy one.'] },
  'Crystalfall Support': boss('Drops from Zorath (Abyss)', 'Drops from Zorath, Vile Assembled, the Abyss pinnacle boss (four Zorath\'s Eye fragments).'),
  'Cull the Weak Support': boss('Drops from Beidat (Beyond)', `Drops from Beidat, Archangel of Death, ${BEYOND}.`),
  'Divine Sentinel Support': boss('Drops from Cardinal Sanctus Vox (Legion)', `Drops from Cardinal Sanctus Vox, ${LEGION}.`),
  'Eclipse Support': boss('Drops from Uber Maven', 'Drops only from the Uber Maven.'),
  'Eldritch Blasphemy Support': boss('Drops from the Elder', 'Drops from the Elder (Absence of Value and Meaning).'),
  'Fissure Support': boss('Drops from K\'tash (Beyond)', `Drops from K'tash, the Hate Shepherd, ${BEYOND}.`),
  'Foulgrasp Support': boss('Drops from the Hive Colony', 'Drops from It That Was Tul and It That Was Esh in the Hive Colony (use a Hivebrain Gland in your Map Device).'),
  'Frostmage Support': boss('Drops from Incarnation of Neglect', 'Drops from the Incarnation of Neglect, normal or Uber.'),
  'Gluttony Support': boss('Drops from the Eater of Worlds', 'Drops from the Eater of Worlds, normal or Uber.'),
  'Greater Ancestral Call Support': boss('Drops from Ghorr (Beyond)', `Drops from Ghorr, the Grasping Maw, ${BEYOND}.`),
  'Greater Chain Support': boss('Drops from Queen Hyrri (Legion)', `Drops from Queen Hyrri Ngamaku, ${LEGION}.`),
  'Greater Devour Support': boss('Drops from Incarnation of Fear', 'Drops from the Incarnation of Fear, normal or Uber.'),
  'Greater Fork Support': boss('Drops from General Lioneye (Legion)', `Drops from General Marceus Lioneye, ${LEGION}.`),
  'Greater Kinetic Instability Support': boss('Drops from Venarius', 'Drops from Venarius (the Cortex), normal or Uber.'),
  'Greater Multistrike Support': boss('Found in Zealot\'s Vault', `Found in the ${ZEALOT}.`),
  'Greater Spell Cascade Support': boss('Found in Arkhon\'s Vault', `Found in the ${ARKHON}.`),
  'Greater Spell Echo Support': boss('Drops from Uber Atziri', 'Drops from Uber Atziri: Atziri in the Temple of Atzoatl when it has a Cradle of Creation (area level 84).'),
  'Greater Unleash Support': boss('Drops from Oshabi (Harvest)', 'Drops from Oshabi, Avatar of the Grove.'),
  'Hexpass Support': boss('Drops from the King in the Mists', 'Drops from the King in the Mists (An Audience With The King, from Ritual).'),
  'Hextoad Support': boss('Drops from the King in the Mists', 'Drops from the King in the Mists (An Audience With The King, from Ritual).'),
  'Hiveborn Support': boss('Drops from the Hive Colony', 'Drops from It That Was Tul and It That Was Esh in the Hive Colony (use a Hivebrain Gland in your Map Device).'),
  'Invention Support': boss('Found in Zealot\'s Vault', `Found in the ${ZEALOT}.`),
  'Invert the Rules Support': boss('Drops from the Maven', 'Drops from the Maven, normal or Uber.'),
  'Lethal Dose Support': boss('Drops from Viper Napuatzi (Legion)', `Drops from Viper Napuatzi, ${LEGION}.`),
  'Machinations Support': boss('Drops from the Trialmaster', 'Drops from the Trialmaster (Ultimatum in area level 81+, or any map with an Ultimatum Scarab of Dueling).'),
  'Overheat Support': boss('Drops from the Searing Exarch', 'Drops from the Searing Exarch, normal or Uber.'),
  'Overloaded Intensity Support': boss('Drops from Nightmare of the Unbreakable', `Drops from the Nightmare of the Unbreakable, the boss of the Fortress Map, ${NIGHTMARE}.`),
  'Pacifism Support': boss('Drops from Oshabi (Harvest)', 'Drops from Oshabi, Avatar of the Grove.'),
  'Pact of Beidat': boss('Drops from Beidat (Beyond)', `Drops from Beidat, Archangel of Death, ${BEYOND}.`),
  'Pact of Ghorr': boss('Drops from Ghorr (Beyond)', `Drops from Ghorr, the Grasping Maw, ${BEYOND}.`),
  'Pact of K\'Tash': boss('Drops from K\'tash (Beyond)', `Drops from K'tash, the Hate Shepherd, ${BEYOND}.`),
  'Pact of Lycia': boss('Drops from Lycia', `Drops from Lycia, Herald of the Scourge, in the Forbidden Sanctum, and from the Nightmare of Lycia in the Sanctuary Map, ${NIGHTMARE}.`),
  'Pyre Support': boss('Drops from Vruun (Breach)', 'Drops from Vruun, Marshal of Xesht, in a stabilised Unstable Breach. A Breach Scarab of the Marshal always spawns him.'),
  'Scornful Herald Support': boss('Drops from Nightmare of Lycia', `Drops from the Nightmare of Lycia, the boss of the Sanctuary Map, ${NIGHTMARE}.`),
  'Transfusion Support': boss('Drops from Saresh (Mirage)', 'Drops from Saresh, of the Weeping Black, in the Black Barya (from Ridan, of the Afarud, in Mirages).'),
  'Unholy Trinity Support': boss('Drops from Nightmare of the Depraved Trinity', `Drops from the Nightmare of the Depraved Trinity, the boss of the Abomination Map, ${NIGHTMARE}.`),
  'Vaal Sacrifice Support': boss('Drops from Uber Atziri', 'Drops from Uber Atziri: Atziri in the Temple of Atzoatl when it has a Cradle of Creation (area level 84).'),
  'Vaal Temptation Support': boss('Drops from the Trialmaster', 'Drops from the Trialmaster (Ultimatum in area level 81+, or any map with an Ultimatum Scarab of Dueling).'),
  'Void Shockwave Support': boss('Drops from Uber Elder', 'Drops from the Uber Elder fight in the Shaper\'s Realm, normal or Uber.'),
  'Voidstorm Support': boss('Drops from the Shaper', 'Drops from the Shaper, normal or Uber.'),

  // Drop-only gems that aren't tied to a boss.
  'Empower Support': { sub: 'Drops anywhere (area level 38+)', text: ['Drops anywhere from area level 38. The Divine Font in the Merciless or Eternal Labyrinth sometimes offers to swap a support gem for a random Empower, Enhance or Enlighten. 3 Gemcutter\'s Mercy cards give one of the three.'] },
  'Enhance Support': { sub: 'Drops anywhere (area level 38+)', text: ['Drops anywhere from area level 38. The Divine Font in the Merciless or Eternal Labyrinth sometimes offers to swap a support gem for a random Empower, Enhance or Enlighten. 3 Gemcutter\'s Mercy cards give one of the three.'] },
  'Enlighten Support': { sub: 'Drops anywhere (area level 38+)', text: ['Drops anywhere from area level 38. The Divine Font in the Merciless or Eternal Labyrinth sometimes offers to swap a support gem for a random Empower, Enhance or Enlighten. 3 Gemcutter\'s Mercy cards give one of the three.'] },
  'Portal': { sub: 'Drops anywhere', text: ['No quest or vendor gives it: it drops anywhere from area level 10. 5 The Realm cards give one with quality.'] },
  'Block Chance Reduction Support': { sub: 'Vendor recipe', text: ['Vendor recipe only: Puncture plus any Dexterity shield with 20% quality.'] },
  'Elemental Penetration Support': { sub: 'Vendor recipe', text: ['Vendor recipe only: Replica Bitterdream (a Grand Heist unique) plus level 20 Fire, Cold and Lightning Penetration.'] },
  'Ancestral Protector': { sub: 'Removed from the game', text: ['Melee totems were removed in 3.25. Only old copies remain.'] },
  'Ancestral Warchief': { sub: 'Removed from the game', text: ['Melee totems were removed in 3.25. Only old copies remain.'] },
  'Vaal Ancestral Warchief': { sub: 'Removed from the game', text: ['Melee totems were removed in 3.25. Only old copies remain.'] },
  'Earthbreaker Support': { sub: 'Removed from the game', text: ['The gem was removed in 3.25. Dawnstrider is now the only source of Earthbreaker.'] }
}

// Regular Awakened supports stopped dropping in 3.28; Exceptional gems
// replaced them. The three Awakened exceptional ones above still drop.
export function gemDrop (name: string, isGem: (name: string) => boolean = () => false): GemDrop | null {
  const known = GEM_DROPS[name]
  if (known) return known
  if (!name.startsWith('Awakened ')) return null
  const text = ['Awakened supports no longer drop anywhere since 3.28: only old copies remain, traded in Standard. The Exceptional gems replaced them.']
  const greater = name === 'Awakened Blasphemy Support' ? 'Eldritch Blasphemy Support' : `Greater ${name.slice('Awakened '.length)}`
  const next = GEM_DROPS[greater]
  if (next && isGem(greater)) text.push(`Its replacement, ${greater}: ${next.sub.charAt(0).toLowerCase()}${next.sub.slice(1)}.`)
  return { sub: 'No longer drops: Standard trade only', text }
}

export const VOIDSTONE_NOTE = 'Exceptional gems only drop once the Originator Voidstone is socketed in your Atlas.'
