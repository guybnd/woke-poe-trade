// The price check's one-off tour (hidden-features audit P6, Guy's pick): on the
// 3rd check in the window, three small cards point at the mod rows, poe.ninja's
// price and a listing, one after another. Got it, ×, or reaching the last card
// ends it for good; a check closed earlier shows it once more (TOUR_SHOWS).
// No Vue here: PriceCheckWindow reads the two constants at startup, so this
// takes only types from the shared tour (TourCard.vue draws it).
import type { TourStep as SharedStep } from '../shared/tour'
export type { TourBit, TourTone } from '../shared/tour'

export const PRICE_CHECK_TOUR = 'price-check-tour'
// Never the 1st check: then you want the price, not a tour.
export const TOUR_AT_CHECK = 3
// Checks it shows on before it gives up.
export const TOUR_SHOWS = 2

export interface TourStep extends SharedStep {
  id: 'mods' | 'price' | 'listing'
  target: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'mods',
    title: 'Mod rows',
    target: '#price-window [data-tour="mods"]:has([data-pc-mod])',
    text: ['Click a mod to switch it on or off. ', { kbd: 'Ctrl + Click' }, ' searches only that one. ', { kbd: 'Right-click' }, ' for its tiers and more.']
  },
  {
    id: 'price',
    title: 'poe.ninja price',
    target: '[data-testid="ninja-verdict-price"]',
    text: ['poe.ninja\'s price, with no trade search spent. When it has a dashed line, click it to read it per divine or in chaos.']
  },
  {
    id: 'listing',
    title: 'Listings',
    // The item listings in the Improved view (not the exchange's, not Classic).
    target: '#price-window [data-tour="listings"] tbody tr:not(.w-pc-yours):not(:has(.w-pc-skel))',
    // Over the list, so it hides none of it.
    anchor: '#price-window [data-tour="listings"] thead',
    above: true,
    text: [
      { tone: 'accent', text: 'Highlighted prices' }, ' are the listings the trade price comes from. ',
      { tone: 'dim', text: 'Dim rows' }, ' are left out or over a week old. The time on the right turns ',
      { tone: 'up', text: 'green' }, ' under an hour and ', { tone: 'down', text: 'red' }, ' after a week.'
    ]
  }
]

// The next step at or after `from` whose target is on screen, or -1.
export function nextStep (from: number, onScreen: (step: TourStep) => boolean): number {
  for (let i = from; i < TOUR_STEPS.length; i++) {
    if (onScreen(TOUR_STEPS[i])) return i
  }
  return -1
}
