// A Valdo map's item text, made up for a price check without owning one
// (Search's "valdo <reward>", What's new's Show me). No imports: tests load it.

/** The item text of a Valdo map with this reward, as the game copies one. */
export function valdoMapText (reward: string): string {
  return [
    'Item Class: Maps',
    'Rarity: Rare',
    'Valdo Map',
    'Valdo Map',
    '--------',
    `Reward: Foil ${reward}`,
    '--------',
    'Item Level: 83',
    '--------',
    'Unmodifiable',
    '--------',
    'Foil (Celestial Emerald)'
  ].join('\n')
}
