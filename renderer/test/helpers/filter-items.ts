// Copied item texts, one or more for every item class NeverSink's filter names.
// They follow the game's Ctrl+C format (Item Class line, `{ Prefix Modifier }`
// mod headers, separators); testing/fixtures/items holds real captures.
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'

export interface CorpusItem {
  name: string
  text: string
  facts: Partial<ItemFacts>
}

const SEP = '--------'
function copy (...sections: string[][]): string {
  return sections.map(s => s.join('\n')).join(`\n${SEP}\n`) + '\n'
}
function item (name: string, facts: Partial<ItemFacts>, ...sections: string[][]): CorpusItem {
  return { name, text: copy(...sections), facts }
}
const reqs = (level: number) => ['Requirements:', `Level: ${level}`]

// A weapon or armour piece of one class, rare and identified.
function rareGear (itemClass: string, base: string, opts: { sockets?: string, ilvl?: number, w?: number, h?: number } = {}): CorpusItem {
  const socketGroups = opts.sockets?.split(' ').map(g => g.replace(/-/g, ''))
  return item(`rare ${itemClass}`, {
    itemClass, baseType: base, rarity: 'Rare', itemLevel: opts.ilvl ?? 84, identified: true, corrupted: false, socketGroups, explicitModNames: ['Merciless', 'of the Ranger']
  }, [`Item Class: ${itemClass}`, 'Rarity: Rare', 'Doom Bite', base], reqs(60),
  ...(opts.sockets ? [[`Sockets: ${opts.sockets} `]] : []),
  [`Item Level: ${opts.ilvl ?? 84}`],
  ['{ Prefix Modifier "Merciless" (Tier: 1) — Damage, Physical, Attack }', '170(170-179)% increased Physical Damage', '{ Suffix Modifier "of the Ranger" (Tier: 3) — Attack, Speed }', '+27(25-29) to Dexterity'])
}

export const CLASS_ITEMS: CorpusItem[] = [
  // ---- Gear ----
  rareGear('One Hand Axes', 'Runic Hatchet', { sockets: 'R-R-G' }),
  rareGear('One Hand Maces', 'Behemoth Mace', { sockets: 'R-R B' }),
  rareGear('One Hand Swords', 'Gemstone Sword', { sockets: 'R-G' }),
  rareGear('Thrusting One Hand Swords', 'Jewelled Foil', { sockets: 'G-G-B' }),
  rareGear('Two Hand Axes', 'Vaal Axe', { sockets: 'R-R-R-R-G-G' }),
  rareGear('Two Hand Maces', 'Coronal Maul', { sockets: 'R-R-R-R-R-R' }),
  rareGear('Two Hand Swords', 'Reaver Sword', { sockets: 'R R R' }),
  rareGear('Bows', 'Thicket Bow', { sockets: 'G-G-G-G-G-G' }),
  rareGear('Claws', 'Imperial Claw', { sockets: 'G-B' }),
  rareGear('Daggers', 'Ambusher', { sockets: 'G-B-B' }),
  rareGear('Rune Daggers', 'Fiend Dagger', { sockets: 'B-B-G' }),
  rareGear('Sceptres', 'Void Sceptre', { sockets: 'B-B-R' }),
  rareGear('Staves', 'Eclipse Staff', { sockets: 'B-B-B-G-R-R' }),
  rareGear('Warstaves', 'Maelström Staff', { sockets: 'G-G-B-B-R-R' }),
  rareGear('Wands', 'Opal Wand', { sockets: 'B-B-B' }),
  rareGear('Body Armours', 'Astral Plate', { sockets: 'R-R-G-G-B-B' }),
  rareGear('Boots', 'Two-Toned Boots', { sockets: 'R-G-B-W' }),
  rareGear('Gloves', 'Fingerless Silk Gloves', { sockets: 'B-B-B-B' }),
  rareGear('Helmets', 'Hubris Circlet', { sockets: 'B-B-G-R' }),
  rareGear('Shields', 'Titanium Spirit Shield', { sockets: 'B-B-B' }),
  rareGear('Quivers', 'Spike-Point Arrow Quiver'),
  rareGear('Amulets', 'Marble Amulet'),
  rareGear('Rings', 'Vermillion Ring'),
  rareGear('Belts', 'Stygian Vise', { sockets: 'A' }),
  rareGear('Fishing Rods', 'Fishing Rod', { sockets: 'G-G-G-G' }),
  rareGear('Trinkets', 'Thief\'s Trinket'),
  // ---- Flasks and tinctures ----
  item('life flask', { itemClass: 'Life Flasks', baseType: 'Divine Life Flask', rarity: 'Normal', quality: 20 },
    ['Item Class: Life Flasks', 'Rarity: Normal', 'Superior Divine Life Flask'],
    ['Quality: +20% (augmented)', 'Recovers 2400 Life over 7 Seconds', 'Consumes 15 of 45 Charges on use', 'Currently has 0 Charges'], reqs(60), ['Item Level: 75'], ['Right click to drink. Can only hold charges while in belt. Refills as you kill monsters.']),
  item('mana flask', { itemClass: 'Mana Flasks', baseType: 'Divine Mana Flask', rarity: 'Magic', explicitModNames: ['Enduring', 'of Staunching'] },
    ['Item Class: Mana Flasks', 'Rarity: Magic', 'Enduring Divine Mana Flask of Staunching'],
    ['Recovers 700 Mana over 6.50 Seconds', 'Consumes 7 of 21 Charges on use'], reqs(60), ['Item Level: 80'],
    ['{ Prefix Modifier "Enduring" (Tier: 1) — Life, Mana, Flask }', '30% reduced Amount Recovered', '{ Suffix Modifier "of Staunching" (Tier: 1) — Flask }', 'Grants Immunity to Bleeding for 4 seconds if used while Bleeding']),
  item('hybrid flask', { itemClass: 'Hybrid Flasks', baseType: 'Hallowed Hybrid Flask', rarity: 'Normal' },
    ['Item Class: Hybrid Flasks', 'Rarity: Normal', 'Hallowed Hybrid Flask'], ['Recovers 1000 Life over 5 Seconds'], reqs(65), ['Item Level: 70']),
  item('utility flask', { itemClass: 'Utility Flasks', baseType: 'Granite Flask', rarity: 'Normal' },
    ['Item Class: Utility Flasks', 'Rarity: Normal', 'Granite Flask'], ['Lasts 4.80 Seconds', '+1500 to Armour'], reqs(27), ['Item Level: 40']),
  item('tincture', { itemClass: 'Tinctures', baseType: 'Prismatic Tincture', rarity: 'Normal' },
    ['Item Class: Tinctures', 'Rarity: Normal', 'Prismatic Tincture'], ['Inflicts Mana Burn every 0.70 Seconds'], reqs(10), ['Item Level: 60']),
  // ---- Jewels ----
  item('jewel', { itemClass: 'Jewels', baseType: 'Cobalt Jewel', rarity: 'Rare' },
    ['Item Class: Jewels', 'Rarity: Rare', 'Dire Glimmer', 'Cobalt Jewel'], ['Item Level: 80'], ['{ Prefix Modifier "Sapphire" (Tier: 1) — Life }', '7% increased maximum Life'], ['Place into an allocated Jewel Socket on the Passive Skill Tree.']),
  item('abyss jewel', { itemClass: 'Abyss Jewels', baseType: 'Murderous Eye Jewel', rarity: 'Rare', itemLevel: 84 },
    ['Item Class: Abyss Jewels', 'Rarity: Rare', 'Dire Eye', 'Murderous Eye Jewel'], reqs(40), ['Item Level: 84'], ['{ Prefix Modifier "Hale" (Tier: 1) — Life }', '+40 to maximum Life']),
  item('cluster jewel', { itemClass: 'Jewels', baseType: 'Large Cluster Jewel', rarity: 'Rare', enchantmentPassiveNum: 8, enchantPassiveNodes: ['12% increased Fire Damage'], anyEnchantment: true },
    ['Item Class: Jewels', 'Rarity: Rare', 'Rune Spark', 'Large Cluster Jewel'], ['Item Level: 84'],
    ['Adds 8 Passive Skills (enchant)', '2 Added Passive Skills are Jewel Sockets (enchant)', 'Added Small Passive Skills grant: 12% increased Fire Damage (enchant)'],
    ['{ Prefix Modifier "Blazing" (Tier: 1) }', 'Added Small Passive Skills also grant: +5 to Strength']),
  // ---- Currency ----
  item('currency', { itemClass: 'Stackable Currency', baseType: 'Chaos Orb', rarity: 'Normal', stackSize: 13 },
    ['Item Class: Stackable Currency', 'Rarity: Currency', 'Chaos Orb'], ['Stack Size: 13/20'], ['Reforges a rare item with new random modifiers'], ['Right click this item then left click a rare item to apply it.']),
  item('currency with thousands', { itemClass: 'Stackable Currency', baseType: 'Orb of Alteration', stackSize: 1234 },
    ['Item Class: Stackable Currency', 'Rarity: Currency', 'Orb of Alteration'], ['Stack Size: 1,234/20'], ['Reforges a magic item with new random modifiers']),
  item('fossil', { itemClass: 'Stackable Currency', baseType: 'Pristine Fossil', stackSize: 2 },
    ['Item Class: Stackable Currency', 'Rarity: Currency', 'Pristine Fossil'], ['Stack Size: 2/20'], ['More Life modifiers'], ['Place in a Resonator to influence item crafting.']),
  item('resonator', { itemClass: 'Delve Stackable Socketable Currency', baseType: 'Primitive Chaotic Resonator', stackSize: 1 },
    ['Item Class: Delve Stackable Socketable Currency', 'Rarity: Currency', 'Primitive Chaotic Resonator'], ['Stack Size: 1/10'], ['Reforges a rare item with new random modifiers']),
  item('scarab', { itemClass: 'Map Fragments', baseType: 'Polished Ambush Scarab' },
    ['Item Class: Map Fragments', 'Rarity: Normal', 'Polished Ambush Scarab'], ['Stack Size: 1/20'], ['Area contains an additional Strongbox']),
  item('fragment', { itemClass: 'Map Fragments', baseType: 'Fragment of the Hydra' },
    ['Item Class: Map Fragments', 'Rarity: Normal', 'Fragment of the Hydra'], ['Can be used in a personal Map Device.']),
  item('misc map item', { itemClass: 'Misc Map Items', baseType: 'Simulacrum Splinter', stackSize: 8 },
    ['Item Class: Misc Map Items', 'Rarity: Normal', 'Simulacrum Splinter'], ['Stack Size: 8/300'], ['Combine 300 Splinters to create a Simulacrum.']),
  item('divination card', { itemClass: 'Divination Cards', baseType: 'The Doctor', stackSize: 2 },
    ['Item Class: Divination Cards', 'Rarity: Divination Card', 'The Doctor'], ['Stack Size: 2/8'], ['Headhunter', 'Leather Belt'], ['Fear has no place in a good doctor.']),
  // ---- Gems ----
  item('skill gem', { itemClass: 'Skill Gems', baseType: 'Arc', gemLevel: 21, quality: 20, corrupted: true },
    ['Item Class: Skill Gems', 'Rarity: Gem', 'Arc'], ['Spell, Chaining, Lightning', 'Level: 21 (Max)', 'Cost: 20 Mana'], ['Quality: +20% (augmented)'], reqs(90), ['An arc of lightning.'], ['Corrupted']),
  item('support gem', { itemClass: 'Support Gems', baseType: 'Added Fire Damage Support', gemLevel: 1 },
    ['Item Class: Support Gems', 'Rarity: Gem', 'Added Fire Damage Support'], ['Support, Fire', 'Level: 1'], reqs(8), ['Supports attacks.']),
  item('vaal gem', { itemClass: 'Skill Gems', baseType: 'Vaal Arc', gemLevel: 20, corrupted: true },
    ['Item Class: Skill Gems', 'Rarity: Gem', 'Vaal Arc'], ['Spell, Chaining, Lightning, Vaal', 'Level: 20 (Max)'], reqs(70), ['Corrupted']),
  // ---- Maps ----
  item('white map', { itemClass: 'Maps', baseType: 'Map (Tier 5)', rarity: 'Normal', mapTier: 5, blightedMap: false, uberBlightedMap: false },
    ['Item Class: Maps', 'Rarity: Normal', 'Map (Tier 5)'], ['Map Tier: 5'], ['Item Level: 72'], ['Travel to this Map by using it in a personal Map Device.']),
  item('blighted map', { itemClass: 'Maps', baseType: 'Map (Tier 16)', rarity: 'Normal', mapTier: 16, blightedMap: true, uberBlightedMap: false },
    ['Item Class: Maps', 'Rarity: Normal', 'Blighted Map (Tier 16)'], ['Map Tier: 16'], ['Item Level: 83'], ['Area is infested with Fungal Growths'], ['Travel to this Map by using it in a personal Map Device.']),
  item('blight-ravaged map', { itemClass: 'Maps', baseType: 'Map (Tier 16)', rarity: 'Normal', mapTier: 16, blightedMap: false, uberBlightedMap: true },
    ['Item Class: Maps', 'Rarity: Normal', 'Blight-ravaged Map (Tier 16)'], ['Map Tier: 16'], ['Item Level: 83'], ['Travel to this Map by using it in a personal Map Device.']),
  item('unique map', { itemClass: 'Maps', baseType: 'Map (Tier 16)', rarity: 'Unique', mapTier: 16 },
    ['Item Class: Maps', 'Rarity: Unique', 'Maelström of Chaos', 'Map (Tier 16)'], ['Map Tier: 16'], ['Item Level: 83'], ['Travel to this Map by using it in a personal Map Device.']),
  item('tier 17 map', { itemClass: 'Maps', baseType: 'Map (Tier 17)', rarity: 'Rare', mapTier: 17 },
    ['Item Class: Maps', 'Rarity: Rare', 'Grim Hollow', 'Map (Tier 17)'], ['Map Tier: 17'], ['Item Level: 84'], ['Travel to this Map by using it in a personal Map Device.']),
  item('magic map', { itemClass: 'Maps', baseType: 'Map (Tier 5)', rarity: 'Magic', mapTier: 5 },
    ['Item Class: Maps', 'Rarity: Magic', 'Twinned Map (Tier 5) of Exposure'], ['Map Tier: 5'], ['Item Level: 72'],
    ['{ Prefix Modifier "Twinned" (Tier: 1) }', 'Area contains two Unique Bosses', '{ Suffix Modifier "of Exposure" (Tier: 1) }', 'Players have -10% maximum Resistances']),
  // ---- Heist ----
  item('contract', { itemClass: 'Contracts', baseType: 'Contract: Trial Run', rarity: 'Rare' },
    ['Item Class: Contracts', 'Rarity: Rare', 'Prize Prize', 'Contract: Trial Run'], ['Heist Target: Trove', 'Requires Deception (Level 5)', 'Area Level: 81'], ['Item Level: 81']),
  item('blueprint', { itemClass: 'Blueprints', baseType: 'Blueprint: Bunker', rarity: 'Rare' },
    ['Item Class: Blueprints', 'Rarity: Rare', 'Prize Prize', 'Blueprint: Bunker'], ['Heist Target: Trove', 'Wings Revealed: 1/3', 'Area Level: 83'], ['Item Level: 83']),
  item('heist cloak', { itemClass: 'Heist Cloaks', baseType: 'Hooded Cloak', rarity: 'Normal' },
    ['Item Class: Heist Cloaks', 'Rarity: Normal', 'Hooded Cloak'], ['Item Level: 75'], ['Can only be equipped to Heist members.']),
  item('heist brooch', { itemClass: 'Heist Brooches', baseType: 'Silver Brooch', rarity: 'Normal' },
    ['Item Class: Heist Brooches', 'Rarity: Normal', 'Silver Brooch'], ['Item Level: 75'], ['Can only be equipped to Heist members.']),
  item('heist gear', { itemClass: 'Heist Gear', baseType: 'Obsidian Sharpening Stone', rarity: 'Normal' },
    ['Item Class: Heist Gear', 'Rarity: Normal', 'Obsidian Sharpening Stone'], ['Item Level: 75'], ['Can only be equipped to Heist members.']),
  item('heist tool', { itemClass: 'Heist Tools', baseType: 'Precise Arrowhead', rarity: 'Normal' },
    ['Item Class: Heist Tools', 'Rarity: Normal', 'Precise Arrowhead'], ['Item Level: 75'], ['Can only be equipped to Heist members.']),
  item('heist target', { itemClass: 'Heist Targets', baseType: 'Golden Idol' },
    ['Item Class: Heist Targets', 'Rarity: Normal', 'Golden Idol'], ['Deliver to Whakano.']),
  // ---- Sanctum, Ultimatum, Delirium and friends ----
  item('sanctum research', { itemClass: 'Sanctum Research', baseType: 'Forbidden Tome', rarity: 'Normal' },
    ['Item Class: Sanctum Research', 'Rarity: Normal', 'Forbidden Tome'], ['Item Level: 83'], ['Take this item to the Relic Altar in the Forbidden Sanctum to enter.']),
  item('relic', { itemClass: 'Relics', baseType: 'Urn Relic', rarity: 'Magic' },
    ['Item Class: Relics', 'Rarity: Magic', 'Urn Relic of the Ninth Circle'], ['Item Level: 83'], ['{ Suffix Modifier "of the Ninth Circle" (Tier: 1) }', '+20 to maximum Resolve']),
  item('vault key', { itemClass: 'Vault Keys', baseType: 'Ancient Reliquary Key' },
    ['Item Class: Vault Keys', 'Rarity: Normal', 'Ancient Reliquary Key'], ['Can be used in a personal Map Device to open The Vault Beyond.']),
  item('wombgift', { itemClass: 'Wombgifts', baseType: 'Provisioning Wombgift' },
    ['Item Class: Wombgifts', 'Rarity: Normal', 'Provisioning Wombgift'], ['Item Level: 80'], ['Use at the Genesis Tree.']),
  item('corpse', { itemClass: 'Corpses', baseType: 'Perfect Rhoa' },
    ['Item Class: Corpses', 'Rarity: Normal', 'Perfect Rhoa'], ['Item Level: 80'], ['Right click to place at the graveyard.']),
  // 3.30 Wickerman trophy, as in testing/fixtures/items/viscera-ghostly-claw.txt.
  item('viscera', { itemClass: 'Viscera', baseType: 'Ghostly Claw', rarity: 'Normal', itemLevel: 56 },
    ['Item Class: Viscera', 'Rarity: Normal', 'Ghostly Claw'], ['Upper Limb'], ['Item Level: 56'],
    ['{ Implicit Modifier }', '9(8-12)% chance to gain Elusive on Kill'], ['Take this to the Wickerman in a town or hideout to attach it.']),
  item('incursion item', { itemClass: 'Incursion Items', baseType: 'Stone of Passage' },
    ['Item Class: Incursion Items', 'Rarity: Normal', 'Stone of Passage'], ['Opens a door in the Temple of Atzoatl.']),
  item('labyrinth item', { itemClass: 'Labyrinth Items', baseType: 'Offering to the Goddess' },
    ['Item Class: Labyrinth Items', 'Rarity: Normal', 'Offering to the Goddess'], ['Item Level: 80'], ['Can be used at the Aspirant\'s Plaza.']),
  item('labyrinth trinket', { itemClass: 'Labyrinth Trinkets', baseType: 'Golden Key' },
    ['Item Class: Labyrinth Trinkets', 'Rarity: Normal', 'Golden Key'], ['Opens one golden door.']),
  item('quest item', { itemClass: 'Quest Items', baseType: 'Book of Skill' },
    ['Item Class: Quest Items', 'Rarity: Normal', 'Book of Skill'], ['Grants a skill point.']),
  item('pantheon soul', { itemClass: 'Pantheon Souls', baseType: 'Captured Soul of Tukohama' },
    ['Item Class: Pantheon Souls', 'Rarity: Normal', 'Captured Soul of Tukohama'], ['Right click to upgrade.']),
  item('harbinger piece', { itemClass: 'Pieces', baseType: 'Cloth Belt Piece', rarity: 'Unique' },
    ['Item Class: Pieces', 'Rarity: Unique', 'First Piece of Time', 'Cloth Belt Piece'], ['Combine with the other pieces.'])
]

// Special states filters care about.
export const STATE_ITEMS: CorpusItem[] = [
  item('unique, identified', { itemClass: 'Body Armours', baseType: 'Glorious Plate', rarity: 'Unique', identified: true, corrupted: false },
    ['Item Class: Body Armours', 'Rarity: Unique', 'Kaom\'s Heart', 'Glorious Plate'], ['Armour: 700'], reqs(68), ['Sockets: R '], ['Item Level: 80'], ['{ Unique Modifier — Life }', '+500 to maximum Life']),
  item('unique, unidentified', { itemClass: 'Body Armours', baseType: 'Glorious Plate', rarity: 'Unique', identified: false },
    ['Item Class: Body Armours', 'Rarity: Unique', 'Glorious Plate'], ['Armour: 700'], reqs(68), ['Item Level: 80'], ['Unidentified']),
  item('rare, unidentified', { itemClass: 'Boots', baseType: 'Two-Toned Boots', rarity: 'Rare', identified: false, explicitModNames: [] },
    ['Item Class: Boots', 'Rarity: Rare', 'Two-Toned Boots'], ['Armour: 100'], reqs(70), ['Item Level: 85'], ['Unidentified']),
  item('magic with both affixes', { itemClass: 'Rings', baseType: 'Sapphire Ring', rarity: 'Magic', explicitModNames: ['Sapphire', 'of the Whelpling'] },
    ['Item Class: Rings', 'Rarity: Magic', 'Sapphire Sapphire Ring of the Whelpling'], reqs(10), ['Item Level: 40'],
    ['{ Prefix Modifier "Sapphire" (Tier: 3) — Life }', '+20 to maximum Life', '{ Suffix Modifier "of the Whelpling" (Tier: 7) }', '+5 to Strength']),
  item('corrupted with implicit', { itemClass: 'Amulets', baseType: 'Onyx Amulet', rarity: 'Rare', corrupted: true, corruptedMods: 1, hasImplicitMod: true },
    ['Item Class: Amulets', 'Rarity: Rare', 'Dire Heart', 'Onyx Amulet'], reqs(20), ['Item Level: 84'],
    ['{ Corruption Implicit Modifier — Gem }', '+1 to Level of all Skill Gems (implicit)'], ['{ Prefix Modifier "Hale" (Tier: 1) — Life }', '+40 to maximum Life'], ['Corrupted']),
  item('mirrored', { itemClass: 'Rings', baseType: 'Vermillion Ring', rarity: 'Rare', mirrored: true },
    ['Item Class: Rings', 'Rarity: Rare', 'Dire Coil', 'Vermillion Ring'], reqs(60), ['Item Level: 84'], ['{ Prefix Modifier "Hale" (Tier: 1) — Life }', '+40 to maximum Life'], ['Mirrored']),
  item('fractured', { itemClass: 'Gloves', baseType: 'Fingerless Silk Gloves', rarity: 'Rare', fractured: true, explicitModNames: ['Hale'] },
    ['Item Class: Gloves', 'Rarity: Rare', 'Dire Grip', 'Fingerless Silk Gloves'], reqs(60), ['Item Level: 84'],
    ['{ Fractured Prefix Modifier "Hale" (Tier: 1) — Life }', '+40 to maximum Life (fractured)'], ['Fractured Item']),
  item('synthesised', { itemClass: 'Rings', baseType: 'Vermillion Ring', rarity: 'Rare', synthesised: true, hasImplicitMod: true },
    ['Item Class: Rings', 'Rarity: Rare', 'Dire Coil', 'Synthesised Vermillion Ring'], reqs(60), ['Item Level: 84'],
    ['{ Synthesis Implicit Modifier }', '+20 to maximum Life (implicit)'], ['{ Prefix Modifier "Hale" (Tier: 1) — Life }', '+40 to maximum Life'], ['Synthesised Item']),
  item('shaper influenced', { itemClass: 'Helmets', baseType: 'Hubris Circlet', rarity: 'Rare', influences: ['Shaper'] },
    ['Item Class: Helmets', 'Rarity: Rare', 'Dire Crown', 'Hubris Circlet'], reqs(69), ['Item Level: 85'], ['{ Prefix Modifier "Hale" (Tier: 1) — Life }', '+40 to maximum Life'], ['Shaper Item']),
  item('double influenced', { itemClass: 'Helmets', baseType: 'Hubris Circlet', rarity: 'Rare', influences: ['Crusader', 'Hunter'] },
    ['Item Class: Helmets', 'Rarity: Rare', 'Dire Crown', 'Hubris Circlet'], reqs(69), ['Item Level: 85'], ['{ Prefix Modifier "Hale" (Tier: 1) — Life }', '+40 to maximum Life'], ['Crusader Item', 'Hunter Item']),
  item('zana memory map', { itemClass: 'Maps', baseType: 'Map (Tier 14)', rarity: 'Normal', mapTier: 14, zanaMemory: true },
    ['Item Class: Maps', 'Rarity: Normal', 'Map (Tier 14)'], ['Map Tier: 14'], ['Item Level: 80'], ["Zana's Memory"]),
  item('exceptional gem', { itemClass: 'Support Gems', baseType: 'Enlighten Support', exceptional: true, gemLevel: 3 },
    ['Item Class: Support Gems', 'Rarity: Gem', 'Enlighten Support'], ['Support, Exceptional', 'Level: 3 (Max)'], reqs(60)),
  item('dropped level', { itemClass: 'Two Hand Axes', baseType: 'Vaal Axe', dropLevel: 64, rarity: 'Rare' },
    ['Item Class: Two Hand Axes', 'Rarity: Rare', 'Doom Bite', 'Vaal Axe'], reqs(64), ['Item Level: 84']),
  item('superior magic', { itemClass: 'Gloves', baseType: 'Iron Gauntlets', rarity: 'Normal', quality: 12 },
    ['Item Class: Gloves', 'Rarity: Normal', 'Superior Iron Gauntlets'], ['Quality: +12% (augmented)', 'Armour: 7'], ['Item Level: 3']),
  item('replica unique', { itemClass: 'Helmets', baseType: 'Sinner Tricorne', rarity: 'Unique', replica: true },
    ['Item Class: Helmets', 'Rarity: Unique', 'Replica Alpha\'s Howl', 'Sinner Tricorne'], ['Item Level: 80'], ['{ Unique Modifier }', '+2 to Level of Socketed Aura Gems']),
  item('foulborn unique', { itemClass: 'Boots', baseType: 'Slink Boots', rarity: 'Unique', foulborn: true },
    ['Item Class: Boots', 'Rarity: Unique', 'Foulborn Atziri\'s Step', 'Slink Boots'], ['Item Level: 80'], ['{ Unique Modifier }', '30% increased Movement Speed']),
  item('memory strands', { itemClass: 'Rings', baseType: 'Vermillion Ring', rarity: 'Rare', memoryStrands: 30 },
    ['Item Class: Rings', 'Rarity: Rare', 'Dire Coil', 'Vermillion Ring'], reqs(60), ['Item Level: 84'], ['{ Prefix Modifier "Hale" (Tier: 1) — Life }', '+40 to maximum Life'], ['Memory Strands: 30']),
  item('six-link white sockets', { itemClass: 'Body Armours', baseType: 'Astral Plate', rarity: 'Normal', socketGroups: ['WWWWWW'] },
    ['Item Class: Body Armours', 'Rarity: Normal', 'Astral Plate'], reqs(62), ['Sockets: W-W-W-W-W-W '], ['Item Level: 84']),
  item('split sockets', { itemClass: 'Body Armours', baseType: 'Astral Plate', rarity: 'Normal', socketGroups: ['RRG', 'BB', 'G'] },
    ['Item Class: Body Armours', 'Rarity: Normal', 'Astral Plate'], reqs(62), ['Sockets: R-R-G B-B G '], ['Item Level: 84']),
  item('enchanted boots', { itemClass: 'Boots', baseType: 'Two-Toned Boots', rarity: 'Rare', anyEnchantment: true, enchantments: ['Enchantment Regeneration'] },
    ['Item Class: Boots', 'Rarity: Rare', 'Dire Stride', 'Two-Toned Boots'], reqs(70), ['Item Level: 84'], ['Enchantment Regeneration (enchant)'], ['{ Prefix Modifier "Hale" (Tier: 1) — Life }', '+40 to maximum Life'])
]
