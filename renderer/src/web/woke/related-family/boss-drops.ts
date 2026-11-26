// Uniques only one boss drops that the item data's drop groups (item-drop.json)
// don't list: Delve, Abyss, Harvest, Expedition, Settlers and map bosses.
// Every name was checked on poedb (its "Limit: <boss> Dropped by" line, or the
// boss page's unique list), 2026-11-25. Left out because poedb doesn't say:
// Curiosity, The Bandit Lord's Band, Tecrod's Gaze (also Abyssal Troves and
// Stygian Spires), Mantle of Dreams, The Draugur's Lantern, Oni-Goroshi, and
// the Ultimatum uniques (a mechanic's reward, not one boss's drop).
// A boss's drops that the drop groups already list (Uber Atziri's, the
// Incarnations') are here too, so the group reads whole.
export const BOSS_DROPS: ReadonlyArray<{ boss: string, uniques: readonly string[] }> = [
  { boss: 'Aul, the Crystal King', uniques: ["Ahkeli's Meadow", "Aul's Uprising", 'Crown of the Tyrant', "Putembo's Mountain", "Uzaza's Valley"] },
  { boss: 'Kurgal, the Blackblooded', uniques: ["Ahkeli's Valley", 'Command of the Pit', 'Hale Negator', "Putembo's Meadow", "Uzaza's Mountain"] },
  { boss: 'Ahuatotli, the Blind', uniques: ["Ahkeli's Mountain", 'Cerberus Limb', "Doryani's Machinarium", "Putembo's Valley", "Uzaza's Meadow"] },
  { boss: 'Atziri, Queen of the Vaal', uniques: ["Atziri's Promise", "Atziri's Step", "Doryani's Invitation", 'Pledge of Hands'] },
  { boss: 'Uber Atziri', uniques: ["Atziri's Acuity", "Atziri's Disfavour", "Atziri's Reflection", "Atziri's Rule", "Atziri's Splendour", 'Beauty', 'The Vertex', 'Triumvirate Authority'] },
  { boss: 'Incarnation of Dread', uniques: ['Bonemeld', 'Seven Teachings', 'The Dark Monarch', 'Wine of the Prophet'] },
  { boss: 'Incarnation of Fear', uniques: ["Enmity's Embrace", 'Servant of Decay', 'Starcaller', 'The Unseen Hue'] },
  { boss: 'Olroth, Origin of the Fall', uniques: ["Cadigan's Crown", 'Heroic Tragedy', "Olroth's Resolve", "Vorana's March"] },
  { boss: 'Velka, the Tide Witch', uniques: ['Pearl of Tsoatha', 'Seablister', 'Stormblood', "The Crustacean's Call"] },
  { boss: 'an Abyss Lich', uniques: ["Amanamu's Gaze", 'Bubonic Trail', 'Darkness Enthroned', "Kurgal's Gaze", 'Lightpoacher', 'Shroud of the Lightless', 'Tombfist', "Ulaman's Gaze"] },
  { boss: 'The Trialmaster', uniques: ['Ambition', "Yaomac's Accord"] },
  { boss: 'Sasan, the Bandit Lord', uniques: ['The Living Blade'] },
  { boss: 'Admiral Valerius', uniques: ["Admiral's Arrogance"] },
  { boss: 'Ersi, Mother of Thorns', uniques: ["Bear's Girdle"] },
  { boss: 'Captainsbane', uniques: ["Dread Captain's Cutlass"] },
  { boss: 'The Pillars of Arun', uniques: ["Gorgon's Gaze"] },
  { boss: 'Janaar, the Omen', uniques: ['Plume of Pursuit'] },
  { boss: 'The Black Knight', uniques: ['Svalinn'] },
  { boss: 'Namharim, Born of Night', uniques: ['The Felbog Fang'] },
  { boss: 'Effulgent Blightworm', uniques: ['Putrid Seed'] }
]

// The boss that drops a unique, by its English name.
export function bossOf (name: string) {
  return BOSS_DROPS.find(b => b.uniques.includes(name)) ?? null
}
