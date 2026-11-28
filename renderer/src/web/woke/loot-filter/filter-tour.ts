// The loot filter's tutorial (Guy's picks A + C, F1, 2026-11-28):
// - A: the first time the window opens on our own filter, six cards walk
//   through it (TourCard.vue), skipping any whose target isn't on screen.
// - C: the ? in the title bar opens "How the filter works" (FilterHelp.vue),
//   a tile per part, each with Show me, and Replay tour.
// - F1: the first Alt+F card gets three cards of its own.
// Each is a hint (shared/hints.ts), so new installs get it too. No Vue here.
import type { TourStep } from '../shared/tour'

export const FILTER_TOUR = 'loot-filter-tour'
export const ALTF_TOUR = 'loot-filter-altf-tour'
// The ? is lit until it's first opened.
export const FILTER_HELP = 'loot-filter-help'

// Each target is looked up inside the filter window (TourCard's scope).
export const FILTER_TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'all',
    title: 'All loot',
    target: '[data-loot-all]',
    text: ['One ruler for everything. Open it and drag a handle to see more or less. Click a step\'s dot to turn it off.']
  },
  {
    id: 'section',
    title: 'Section rulers',
    target: '[data-currency-page-ruler]',
    text: ['Each page has its own, and a section can too (Own ruler). Move one and it wins over All loot. Its undo arrow follows All loot again.']
  },
  {
    id: 'steps',
    title: 'Steps',
    target: ['[data-loot-all-prices]', '[data-loot-all] [data-currency-ruler]'],
    text: ['Small, Normal, Decent, Big, Tink. Each is bigger and louder. Decent and up get a beam.']
  },
  {
    id: 'mode',
    title: 'Section choice',
    target: '[data-loot-section-mode]',
    text: ['By price estimate follows the ruler. Always show or Always hide sets the whole section, whatever the price.']
  },
  {
    id: 'gear',
    title: 'Gear',
    target: '[role="tab"][data-tab="weights"]',
    text: ['Base ranks put the best bases first, in groups. Weights say which mods make a rare worth a look.']
  },
  {
    id: 'preview',
    title: 'Preview',
    target: '[role="tab"][data-tab="preview"]',
    text: ['Sample drops with your filter. They change as you do.']
  }
]

// On the Alt+F card (SampleCard, CurrencyCard, ScoreCard).
export const ALTF_TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'path',
    title: 'Rule path',
    target: ['[data-currency-card-rule] [role="group"]', '[data-score-rule] [role="group"]'],
    text: ['Pick the level you change: this item or its whole section. Loot is All loot: change it on the Loot tab.']
  },
  {
    id: 'needle',
    title: 'Needle',
    target: ['[data-currency-card-bar]', '[data-score-bar]'],
    text: ['Drag to show this more or less.']
  },
  {
    id: 'undo',
    title: 'Ctrl+Z',
    target: '[data-filter-card-save]',
    above: true,
    text: [{ kbd: 'Ctrl + Z' }, ' undoes the last change.']
  }
]

// How the filter works: one tile per part. `show` is what Show me opens:
// a tab and the element it flashes there, or a sample Alt+F card.
export type HelpPicture = 'steps' | 'mode' | 'keys' | 'none'
export interface HelpTile {
  id: string
  name: string
  text: string
  picture: HelpPicture
  show: { tab: 'currency' | 'weights' | 'preview', at: string, open?: true } | { sample: true }
}

export const HELP_TILES: readonly HelpTile[] = [
  { id: 'all', name: 'All loot', picture: 'steps', text: 'One ruler for everything. Drag a handle; click a step\'s dot to turn it off.', show: { tab: 'currency', at: '[data-loot-all]' } },
  { id: 'section', name: 'Section rulers', picture: 'steps', text: 'Each page has its own, a section can too. It wins over All loot; undo follows it again.', show: { tab: 'currency', at: '[data-currency-page-ruler]' } },
  { id: 'steps', name: 'Steps', picture: 'steps', text: 'Small to Tink: bigger, louder, a beam from Decent up.', show: { tab: 'currency', at: '[data-loot-all] [data-currency-ruler]', open: true } },
  { id: 'mode', name: 'Section choice', picture: 'mode', text: 'By price estimate, Always show or Always hide, for a whole section.', show: { tab: 'currency', at: '[data-loot-section-mode]' } },
  { id: 'altf', name: 'Alt+F', picture: 'keys', text: 'On an item in game: pick the level, drag the needle, Ctrl+Z undoes.', show: { sample: true } },
  { id: 'gear', name: 'Gear', picture: 'none', text: 'Base ranks in groups, and the mod weights that make a rare worth a look.', show: { tab: 'weights', at: '[data-equip-tab]' } },
  { id: 'preview', name: 'Preview', picture: 'none', text: 'Sample drops with your filter, live.', show: { tab: 'preview', at: '[data-filter-preview]' } }
]

// Alt+F's Show me: a Chaos Orb, as the game copies it.
export const SAMPLE_ITEM = `Item Class: Stackable Currency
Rarity: Currency
Chaos Orb
--------
Stack Size: 12/20
--------
Reforges a rare item with new random modifiers
--------
Right click this item then left click a rare item to apply it.
Shift click to unstack.`
