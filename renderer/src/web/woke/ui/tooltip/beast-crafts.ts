// What a captured beast does: its Bestiary recipes, from poedb's Bestiary
// Recipe page (2026-11). A line with a colon is a recipe ("Modify Mods on an
// Item: Add a Prefix, Remove a Random Suffix"); one without is the recipe's
// condition. Beasts poedb lists only in aspect and portal recipes aren't here:
// that part of the page couldn't be read word for word. Loaded on the first
// beast hover, so it costs startup nothing.
export const BEAST_CRAFTS: Record<string, string[]> = {
  'Craicic Croaker': ['Create an Imprint: Of a Magic Item'],
  'Craicic Maw': ['Modify Mods on an Item: Add a Mod to a Shaper Item', 'Modify Mods on an Item: Add a Mod to an Elder Item', 'Modify Mods on an Item: Add a Mod to a Redeemer Item', 'Modify Mods on an Item: Add a Mod to a Hunter Item', 'Modify Mods on an Item: Add a Mod to a Crusader Item', 'Modify Mods on an Item: Add a Mod to a Warlord Item'],
  'Craicic Sand Spitter': ['Create Currency Items: Orb of Fusing', 'Create Currency Items: A Stack of 2 Orbs of Binding', 'Modify an Item: to Have Maximum Possible Links'],
  'Craicic Savage Crab': ['Create a Unique: Item', 'Modify Mods on an Item: Add a Mod to a Rare Map', 'Only works on rare maps'],
  'Craicic Shield Crab': ["Create Currency Items: A Stack of 4 Jeweller's Orbs", 'Create Currency Items: A Stack of 2 Orbs of Binding', 'Modify an Item: to Have Maximum Possible Number of Sockets'],
  'Craicic Squid': ['Transform an Item: Reroll a Talisman Base Type', 'Retains Implicit and Explicit Modifiers'],
  'Craicic Vassal': ['Corrupt a Map: To have an Implicit Modifier', 'Corrupt a Map: Twice'],
  'Craicic Watcher': ['Create a Unique: Claw or Dagger', 'Modify Mods on an Item: Add a Mod to a Hunter Item'],
  'Farric Ape': ['Create a Unique: Belt'],
  'Farric Chieftain': ['Create a Unique: Amulet'],
  'Farric Flame Hellion Alpha': ['Create a Unique: Ring'],
  'Farric Frost Hellion Alpha': ['Create Currency Items: A Stack of 3 Orbs of Unmaking', 'Fracture a Modifier: On a Rare Talisman with at least 4 modifiers', 'Does not work on Influenced or Fractured items'],
  'Farric Gargantuan': ['Create Currency Items: A Stack of 3 Orbs of Unmaking', 'Create a Unique: Helmet'],
  'Farric Goatman': ['Create a Unique: Flask'],
  'Farric Goliath': ['Create a Unique: Bow', 'Modify Mods on an Item: Add a Mod to a Crusader Item'],
  'Farric Lynx Alpha': ['Modify Mods on an Item: Add a Suffix, Remove a Random Prefix', 'Only works on rare items'],
  'Farric Magma Hound': ['Create an Item: 23% Quality Corrupted Gem'],
  'Farric Pit Hound': ['Create an Item: Level 21 Corrupted Gem'],
  'Farric Taurus': ['Create a Unique: Map'],
  'Farric Ursa': ['Create a Unique: Body Armour'],
  'Farric Wolf Alpha': ['Modify Mods on an Item: Add a Prefix, Remove a Random Suffix', 'Only works on rare items'],
  'Fenumal Devourer': ['Create a Unique: Shield or Quiver', 'Modify Mods on an Item: Add a Mod to a Shaper Item'],
  'Fenumal Plagued Arachnid': ['Create an Imprint: Of a Rare Talisman', 'Fracture two Modifers: On a Rare Talisman with at least 6 modifiers', 'Does not work on Influenced or Fractured items'],
  'Fenumal Queen': ['Create a Unique: Staff', 'Modify Mods on an Item: Add a Mod to a Redeemer Item'],
  'Fenumal Scorpion': ['Corrupt a Map: Twice', 'Convert this Unique Item: Into Another Random Unique Item'],
  'Fenumal Scrabbler': ['Create a Unique: Wand', 'Modify Mods on an Item: Add a Mod to a Warlord Item'],
  'Fenumal Widow': ['Create a Unique: Gloves'],
  'Primal Crushclaw': ['Create an Item: A valuable Scarab'],
  'Primal Cystcaller': ['Create an Item: Nightmare Map'],
  'Primal Rhex Matriarch': ['Create an Item: Synthesis Unique Map'],
  'Saqawine Blood Viper': ['Create a Unique: Sword or Axe', 'Modify Mods on an Item: Add a Mod to an Elder Item'],
  'Saqawine Chimeral': ['Create Currency Items: A Stack of 10 Random Currency'],
  'Saqawine Cobra': ['Create a Unique: Mace or Sceptre', 'Modify Mods on an Item: Add a Mod to a Rare Map', 'Only works on rare maps'],
  'Saqawine Retch': ['Create a Unique: Boots'],
  'Saqawine Rhoa': ['Create a Rare: Four-Linked Helmet'],
  'Saqawine Vulture': ['Create an Item: Fully-linked Six-socket Rare'],
  'Vivid Abberarach': ['Create an Item: Shaper Guardian, Elder Guardian or Conqueror Map'],
  'Vivid Vulture': ['Transform an Item: Reroll a Synthesis Implicit Modifier on a Unique Item'],
  'Wild Brambleback': ['Transform an Item: Adds 500m Experience to an Exceptional Support Gem'],
  'Wild Bristle Matron': ['Modify Mods on an Item: Add a crafted Meta-modifier to a non-Unique Item'],
  'Wild Hellion Alpha': ["Modify Mods on an Item: Reroll a Watcher's Eye Modifier", 'Cannot reroll Maximum Life, Mana or Energy Shield modifiers']
}
