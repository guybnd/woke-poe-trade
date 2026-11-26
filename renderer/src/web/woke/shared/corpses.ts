// Corpse items (Raise Spectre corpses), by monster: each comes as "Imperfect X", "X" and
// "Perfect X". The item data has no class for them, so the list is kept here;
// test/woke/corpses.test.ts checks it against the item data.
const CORPSES = new Set([
  'Adherent of Zarokh', 'Astral Lich', 'Blasphemer', 'Blood Demon', 'Conjuror of Rot', 'Dancing Sword',
  'Dark Marionette', 'Dark Reaper', 'Druidic Alchemist', 'Eldritch Eye', 'Fiery Cannibal', 'Forest Tiger',
  'Forest Warrior', 'Frozen Cannibal', 'Guardian Turtle', 'Half-remembered Goliath', 'Hulking Miscreation',
  'Hydra', 'Judgemental Spirit', 'Meatsack', 'Naval Officer', 'Needle Horror', 'Pain Artist', 'Primal Demiurge',
  'Primal Thunderbird', 'Runic Skeleton', 'Sanguimancer Demon', 'Sawblade Horror', 'Serpent Warrior',
  'Shadow Construct', 'Slashing Horror', 'Spider Matriarch', 'Spirit of Fortune', 'Warlord'
])

export const CORPSE_MONSTERS: ReadonlySet<string> = CORPSES

/** A corpse item's name ("Perfect Hydra", "Imperfect Warlord", "Meatsack"). */
export function isCorpse (refName: string): boolean {
  return CORPSES.has(refName.replace(/^(?:Perfect|Imperfect) /, ''))
}
