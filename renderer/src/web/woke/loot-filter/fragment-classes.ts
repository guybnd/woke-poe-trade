// Fragments on the Loot tab (Guy's pick A, 2026-11-27): priced like currency
// on the same ladder, folded by boss. The items come from NeverSink's
// fragment rules (league threads stay in Currency). Fragments don't stack,
// so a fragment's worth is its own price.

export interface LootCategory { id: string, name: string, art: string }

export const FRAGMENT_CATEGORIES: LootCategory[] = [
  { id: 'invites', name: 'Invitations and writs', art: "The Maven's Writ" },
  { id: 'uber', name: 'Uber boss fragments', art: 'Cosmic Fragment' },
  { id: 'shaper', name: 'Shaper and Elder', art: 'Fragment of Knowledge' },
  { id: 'crests', name: 'Conqueror crests', art: "Baran's Crest" },
  { id: 'emblems', name: 'Legion emblems', art: 'Timeless Karui Emblem' },
  { id: 'lab', name: 'Labyrinth offerings', art: 'Offering to the Goddess' },
  { id: 'fragother', name: 'Other fragments', art: 'Simulacrum' }
]
export const FRAGMENT_IDS = new Set(FRAGMENT_CATEGORIES.map(x => x.id))

// The purple family, a shade per fold.
export const FRAGMENT_LOOK: Record<string, { text: [number, number, number], color: string, shape: string }> = {
  invites: { text: [205, 140, 255], color: 'Purple', shape: 'Kite' },
  uber: { text: [235, 120, 235], color: 'Purple', shape: 'Star' },
  shaper: { text: [160, 130, 255], color: 'Purple', shape: 'Hexagon' },
  crests: { text: [200, 170, 255], color: 'Purple', shape: 'Diamond' },
  emblems: { text: [190, 110, 210], color: 'Purple', shape: 'Moon' },
  lab: { text: [215, 185, 235], color: 'Purple', shape: 'Circle' },
  fragother: { text: [180, 120, 240], color: 'Purple', shape: 'Square' }
}

// A fragment's fold, by its name.
export function fragmentCategoryOf (name: string): string {
  if (/Invitation$|^The Maven's Writ$/.test(name)) return 'invites'
  if (/^Fragment of (the )?(Chimera|Hydra|Minotaur|Phoenix|Constriction|Enslavement|Eradication|Purification|Emptiness|Shape|Knowledge|Terror)$/.test(name)) return 'shaper'
  if (/^[A-Z][a-z]+ Fragment$/.test(name)) return 'uber'
  if (/'s Crest$/.test(name)) return 'crests'
  if (/^Timeless .+ Emblem$/.test(name)) return 'emblems'
  if (/ to the Goddess$/.test(name)) return 'lab'
  return 'fragother'
}
