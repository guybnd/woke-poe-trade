// The community's Stacked Deck card weights (D2): a snapshot of the
// Prohibited Library's research sheet, credited wherever the numbers show.
import type { Weights } from './deck'
import PL_WEIGHTS from './pl-weights.json'

export const WEIGHTS: Weights = PL_WEIGHTS
export const WEIGHTS_CREDIT = `Card weights: Prohibited Library community research (patch ${PL_WEIGHTS.patch}, ${PL_WEIGHTS.samples.toLocaleString('en-US')} decks).`
export const WEIGHTS_URL = PL_WEIGHTS.url
