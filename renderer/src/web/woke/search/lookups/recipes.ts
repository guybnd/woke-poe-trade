// Vendor recipes: search by what you get, what you sell, or a nickname
// ("chrome", "6 link", "chaos recipe"). From poedb's vendor recipe page
// (checked for 3.29); recipes GGG removed are left out.
import { matchRank } from '../search'
import type { Lookup, LookupCard, LookupContext } from './types'

export interface Recipe {
  // What you get, as poe.ninja names it when it has a price.
  get: string
  qty?: number
  give: string[]
  note?: string
  // Other names people search it by, comma separated.
  words?: string
  // What it makes is a base type or a gem, not the priced item of that name.
  base?: boolean
}

const R = (get: string, give: string[], extra: Partial<Recipe> = {}): Recipe => ({ get, give, ...extra })

export const RECIPES: Recipe[] = [
  // ---- sockets ----
  R('Chromatic Orb', ['An item with linked red, green and blue sockets'], { words: 'chrome, rgb' }),
  R("Jeweller's Orb", ['An item with 6 sockets'], { qty: 7, words: '6 socket, six socket, 6s, jew' }),
  R('Orb of Fusing', ['An item with 6 linked sockets'], { qty: 20, words: '6 link, six link, 6l, fuse' }),
  // ---- rare sets ----
  R('Chaos Orb', ['A full set of rare items, all item level 60 to 74'], { note: '2 if all are unidentified or all 20% quality, 3 if both. A set fills every slot but flasks, weapon swap and quiver.', words: 'chaos recipe, rare set' }),
  R('Regal Orb', ['A full set of rare items, all item level 75 or higher'], { note: '2 if all are unidentified or all 20% quality, 3 if both.', words: 'regal recipe, rare set' }),
  R('Orb of Chance', ['A full set of rare items, item level 1 to 59'], { note: '2 if all are unidentified or all 20% quality, 3 if both.', words: 'rare set' }),
  R('Exalted Shard', ['A full set of identified rare items with the same influence'], { qty: 2, note: '4 if all are unidentified.', words: 'influence set, shaper set, elder set' }),
  // ---- same name, straight flush ----
  R('Orb of Chance', ['2 identified rare items with the same name']),
  R('Orb of Alchemy', ['3 identified rare items with the same name'], { note: 'Or 2 of them, both at 20% quality.' }),
  R('Regal Orb', ['3 identified rare items with the same name, all 20% quality']),
  R('Orb of Augmentation', ['A normal, a magic and a rare item, identified'], { note: '2 if all are unidentified. 1 Orb of Alchemy if all 20% quality (2 if also unidentified).', words: 'straight flush' }),
  R('Orb of Chance', ['A normal, a magic, a rare and a unique item'], { qty: 5, words: 'straight flush' }),
  R('Orb of Augmentation', ['A rare item with 6 modifiers'], { words: 'sell rare' }),
  R('Orb of Scouring', ['A rare item with 2 modifiers'], { words: 'sell rare' }),
  // ---- quality ----
  R("Armourer's Scrap", ['Armour pieces whose quality adds up to 40%'], { note: 'Or one piece at 20% quality.', words: 'armour quality' }),
  R("Blacksmith's Whetstone", ['Weapons whose quality adds up to 40%'], { note: 'Or one weapon at 20% quality.', words: 'weapon quality' }),
  R("Glassblower's Bauble", ['Flasks whose quality adds up to 40%'], { note: 'Or one flask at 20% quality.', words: 'flask quality' }),
  R("Gemcutter's Prism", ['Skill gems whose quality adds up to 40%'], { note: 'Or one gem at 20% quality.', words: 'gcp, gem quality' }),
  R('Vaal Orb', ['7 Vaal skill gems'], { note: 'Or 1 Sacrifice fragment (Sacrifice at Dawn, Noon, Dusk or Midnight).', words: 'vaal gems, sacrifice' }),
  // ---- currency exchange at vendors ----
  R('Orb of Alchemy', ['1 Orb of Regret'], { note: 'Clarissa, Act 3.' }),
  R('Orb of Regret', ['2 Orb of Scouring'], { note: 'Yeena, Act 2.' }),
  R('Orb of Scouring', ['4 Orb of Chance'], { note: 'Yeena, Act 2.' }),
  R('Orb of Chance', ['1 Orb of Fusing'], { note: 'Clarissa, Act 3.' }),
  R('Orb of Fusing', ["4 Jeweller's Orb"], { note: 'Yeena, Act 2.' }),
  R('Chromatic Orb', ["3 Jeweller's Orb"], { note: 'Yeena, Act 2.' }),
  R("Jeweller's Orb", ['2 Orb of Alteration'], { note: 'Yeena, Act 2.' }),
  R('Orb of Alteration', ['4 Orb of Augmentation'], { note: 'Nessa, Act 1.' }),
  R('Orb of Augmentation', ['4 Orb of Transmutation'], { note: 'Nessa, Act 1.' }),
  R('Orb of Transmutation', ['7 Portal Scroll'], { note: 'Nessa, Act 1.' }),
  R('Portal Scroll', ['3 Scroll of Wisdom'], { note: 'Nessa, Act 1.' }),
  R("Blacksmith's Whetstone", ["3 Armourer's Scrap"], { note: 'Greust, Act 3.' }),
  R("Armourer's Scrap", ["1 Blacksmith's Whetstone"], { note: 'Tarkleigh, Act 1.' }),
  R('Orb of Unmaking', ['2 Orb of Regret'], { note: 'Kirac.' }),
  // ---- gems ----
  R('Skill gem one level lower', ['The gem', '1 Orb of Scouring'], { note: 'Not corrupted or Vaal gems.', words: 'level down gem, gem level down' }),
  R('Skill gem back to level 1', ['The gem', '1 Orb of Regret'], { note: 'Not corrupted or Vaal gems.', words: 'level 1 gem, gem reset' }),
  R('Support gem with 20% quality', ['A level 20 support gem', "1 Gemcutter's Prism"]),
  R('Blink Arrow', ['Mirror Arrow', '1 Orb of Alteration'], { note: 'Works both ways, transfigured versions too.', base: true }),
  R('Mirror Arrow', ['Blink Arrow', '1 Orb of Alteration'], { note: 'Works both ways, transfigured versions too.', base: true }),
  R('Book of Regression', ['1 Orb of Scouring', '1 Scroll of Wisdom']),
  R('Book of Reform', ['20 Orb of Regret', 'An Amber, Jade, Lapis or Onyx Amulet'], { note: 'Eramir, Act 2: Amber for Oak, Jade for Kraityn, Lapis for Alira, Onyx for killing all.', words: 'bandit, respec bandit' }),
  // ---- rings, amulets, flasks ----
  R('Ruby Ring', ['An Iron Ring', 'A red skill gem'], { words: 'iron ring', base: true }),
  R('Topaz Ring', ['An Iron Ring', 'A green skill gem'], { words: 'iron ring', base: true }),
  R('Sapphire Ring', ['An Iron Ring', 'A blue skill gem'], { words: 'iron ring', base: true }),
  R('Prismatic Ring', ['3 Two-Stone Rings, each a different pair'], { base: true }),
  R('Onyx Amulet', ['Any amulet', 'A red, a green and a blue skill gem'], { note: 'Works on a corrupted amulet; the result is not corrupted.', base: true }),
  R('Agate Amulet', ['An Amber Amulet', 'A Lapis Amulet', '1 Orb of Transmutation'], { base: true }),
  R('Turquoise Amulet', ['A Jade Amulet', 'A Lapis Amulet', '1 Orb of Transmutation'], { base: true }),
  R('Citrine Amulet', ['An Amber Amulet', 'A Jade Amulet', '1 Orb of Transmutation'], { base: true }),
  R('Hybrid Flask', ['A Life Flask', 'A Mana Flask', '1 Orb of Fusing'], { base: true }),
  R('Next flask base', ['3 flasks of the same kind (life, mana or hybrid)'], { words: 'flask upgrade' }),
  R('Boots with 5% more movement speed', ['Boots (magic or rare with movement speed, or normal)', 'A Quicksilver Flask', '1 Orb of Augmentation'], { note: 'Normal boots come out with 10%. Repeat up to 30%.', words: 'movement speed, ms, boots, quicksilver' }),
  R('Weapon with added fire damage', ['A magic or rare weapon with added fire damage', 'A Ruby Flask', '1 Orb of Augmentation'], { note: 'One tier higher. Sapphire Flask for cold, Topaz Flask for lightning.', words: 'added damage, leveling weapon' }),
  R('Weapon with added physical damage', ['A magic or rare weapon with added physical damage (or a normal one)', 'A Granite Flask', '1 Orb of Augmentation'], { note: 'One tier higher.', words: 'added damage, leveling weapon' }),
  R('Weapon with 40% to 84% physical damage', ['A weapon', 'A magic, rare or unique Rustic Sash', "1 Blacksmith's Whetstone"], { note: 'Magic sash 40-49%, rare 50-69%, unique 65-84%.', words: 'leveling weapon, physical damage' }),
  R('Weapon with 10% to 59% spell damage', ['A dagger, sceptre, staff or wand', 'A magic, rare or unique Chain Belt', "1 Blacksmith's Whetstone"], { words: 'leveling caster, spell damage' }),
  R('+1 to a spell element\'s gem levels', ['A normal rune dagger, sceptre, staff or wand', 'Gems of that element with 40% quality between them'], { words: 'leveling caster, +1 gems' }),
  R('Helmet with +1 to minion gems', ['A normal helmet', 'Minion gems with 40% quality between them'], { words: 'leveling minion, summoner, +1 minion' }),
  R('Ring or amulet with more chaos resistance', ['A magic or rare ring or amulet with chaos resistance', 'An Amethyst Flask', '1 Orb of Augmentation'], { note: 'One tier higher.', words: 'chaos res' }),
  // ---- 5 to 1, maps, timeless ----
  R('One unidentified item of that base', ['5 magic (or 5 rare) items of the same base type'], { note: 'Lowest item level of the five; no influence.', words: '5 to 1, five to one' }),
  R('Higher tier map', ['3 maps of the same kind'], { words: 'map upgrade' }),
  R('Lethal Pride', ['10 Timeless Karui Splinter'], { words: 'timeless jewel' }),
  R('Brutal Restraint', ['10 Timeless Maraketh Splinter'], { words: 'timeless jewel' }),
  R('Elegant Hubris', ['10 Timeless Eternal Empire Splinter'], { words: 'timeless jewel' }),
  R('Militant Faith', ['10 Timeless Templar Splinter'], { words: 'timeless jewel' }),
  R('Glorious Vanity', ['10 Timeless Vaal Splinter'], { words: 'timeless jewel' }),
  // ---- uniques ----
  R('Kingmaker', ['Soul Taker', 'Heartbreaker', '1 Orb of Fusing']),
  R('Arborix', ['Grelwood Shank', 'Beltimber Blade', '1 Orb of Fusing']),
  R('Duskdawn', ['Shade of Solaris', 'Light of Lunaris', '1 Orb of Fusing']),
  R('Magna Eclipsis', ['Invictus Solaris', 'Vix Lunaris', '1 Orb of Fusing']),
  R('The Retch', ['Faminebind', 'Feastbind', '1 Orb of Fusing']),
  R('The Taming', ["Berek's Respite", "Berek's Pass", "Berek's Grip"]),
  R('The Vinktar Square', ['Agnerod East', 'Agnerod West', 'Agnerod South', 'Agnerod North']),
  R('Lost Unity', ['The Will of Xoph', 'The Will of Tul', 'The Will of Esh', 'The Will of Uul-Netol', 'The Sundered Will']),
  R('The Anima Stone', ['Primordial Eminence', 'Primordial Harmony', 'Primordial Might']),
  R("Precursor's Emblem", ["Ahkeli's Mountain", "Putembo's Valley", "Uzaza's Meadow"]),
  R('Loreweave', ['60 unique rings']),
  R('The Goddess Scorned', ['The Goddess Bound at 20% quality', 'An Elegant Sword at 20% quality', 'A Combustion Support with quality', '1 Orb of Fusing'], { note: 'Sockets, colours and links must match.' }),
  R("Hyrri's Bite", ['A rare Onyx Amulet', 'A normal Sharktooth Arrow Quiver', '1 Orb of Chance', 'A Rain of Arrows with quality']),
  R("Cameria's Avarice", ["Cameria's Maul", 'Ice Bite Support, Glacial Hammer and Ice Spear, each at 20% quality']),
  R('Combat Focus', ['Elemental Hit at 20% quality', 'A Ruby Ring', 'A Sapphire Ring'], { note: 'The ring pair picks the prismatic element.' }),
  R('Reclaimed Malevolence', ['Festering Vengeance', 'Extinguishing Grasp', 'Baleful Dominion', 'Destructive Aspiration']),
  R('Fracturing Shard', ['A Harbinger unique'], { note: 'Not a Harbinger piece, and not The Beachhead.' }),
  R('Coral Amulet', ['7 magic or rare Iron Rings', '1 rare Coral Ring'], { note: 'A rare amulet; item level from the Coral Ring.', base: true }),
  R('Paua Amulet', ['7 magic or rare Iron Rings', '1 rare Paua Ring'], { note: 'A rare amulet; item level from the Paua Ring.', base: true }),
  R('Unique of the same name', ['3 uncorrupted copies of a unique, same name'], { note: 'Acts like a Divine Orb on the result.', words: '3 to 1 unique' }),
  // ---- oils ----
  ...['Clear', 'Sepia', 'Amber', 'Verdant', 'Teal', 'Azure', 'Indigo', 'Violet', 'Crimson', 'Black', 'Opalescent', 'Silver', 'Golden']
    .slice(1)
    .map((oil, i, rest) => R(`${oil} Oil`, [`3 ${i === 0 ? 'Clear' : rest[i - 1]} Oil`], { note: 'Any vendor.', words: 'oil upgrade' }))
]

function norm (text: string): string {
  return text.toLowerCase().replace(/['’]/g, '').replace(/\s+/g, ' ').trim()
}

function rank (r: Recipe, query: string): number {
  const q = norm(query)
  // A nickname: "6l", "chrome", "chaos recipe".
  const phrases = r.words ? r.words.split(',').map(norm) : []
  if (phrases.some(p => p === q || (q.length >= 3 && p.startsWith(q)))) return 0
  if (q.length < 3) return -1
  const got = matchRank(r.get, query)
  if (got >= 0 && got < 2) return got
  // What you sell: a word start, from 4 letters, so "orb" doesn't list them all.
  return q.length >= 4 && r.give.some(g => { const k = matchRank(g, query); return k >= 0 && k < 2 }) ? 2 : -1
}

export function recipeCard (r: Recipe, ctx: LookupContext, i: number): LookupCard {
  const each = r.base ? null : ctx.price(r.get)
  return {
    id: `recipe:${i}`,
    group: 'Vendor recipes',
    // The input too: four recipes make an Orb of Chance.
    name: `${r.qty ? `${r.qty} × ` : ''}${r.get} from ${r.give[0][0].toLowerCase()}${r.give[0].slice(1)}`,
    title: `${r.qty ? `${r.qty} × ` : ''}${r.get}`,
    sub: `Vendor: ${r.give.join(' + ')}`,
    icon: 'fas fa-store',
    sections: [
      { label: 'Sell to a vendor', rows: r.give.map(g => ({ label: g })) },
      { label: 'Get', rows: [{ label: `${r.qty ? `${r.qty} × ` : ''}${r.get}`, ...(each != null ? { chaos: each * (r.qty ?? 1), item: { name: r.get } } : {}) }] },
      ...(r.note ? [{ text: [r.note] }] : [])
    ],
    actions: [{ label: 'Recipe list on poedb', url: 'https://poedb.tw/us/Vendor_recipe_system' }]
  }
}

export const recipeLookup: Lookup = (query, ctx) => {
  if (query.trim().length < 2) return []
  return RECIPES
    .map((r, i) => ({ r, i, rank: rank(r, query) }))
    .filter(h => h.rank >= 0)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5)
    .map(h => recipeCard(h.r, ctx, h.i))
}
