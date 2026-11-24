// The community's Stacked Deck card weights (D2): a snapshot of the
// Prohibited Library's research sheet, credited wherever the numbers show.
import type { Weights } from './deck'
import PL_WEIGHTS from './pl-weights.json'

export const WEIGHTS: Weights = PL_WEIGHTS
export const WEIGHTS_CREDIT = `Card weights: Prohibited Library community research (patch ${PL_WEIGHTS.patch}, ${PL_WEIGHTS.samples.toLocaleString('en-US')} decks).`
export const WEIGHTS_URL = PL_WEIGHTS.url

// A card that drops at least once in this many decks, by the weights. Every
// deck card poe.ninja leaves out (too few trades) drops this often.
const COMMON_ONE_IN = 2000
const WEIGHT_SUM = Object.values(WEIGHTS.weights).reduce((a, b) => a + b, 0)
export function isCommonCard (name: string): boolean {
  const w = WEIGHTS.weights[name]
  return w != null && w * COMMON_ONE_IN >= WEIGHT_SUM
}
