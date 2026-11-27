// Each divination card's set size and reward fold, read from the tooltip
// data once on first use; the filter rebuilds when it lands.
import { shallowRef } from 'vue'
import { loadTipItems } from '../ui/tooltip/item-tip'
import { cardCategoryOf } from './card-classes'
import type { CardFact, CardFacts } from './card-classes'

export const cardFacts = shallowRef<CardFacts | null>(null)
let loading: Promise<void> | null = null
export function loadCardFacts (): Promise<void> {
  loading ??= loadTipItems().then(items => {
    if (!items) { loading = null; return }
    const out = new Map<string, CardFact>()
    for (const [name, tip] of Object.entries(items)) {
      if (tip?.n && tip.d) out.set(name, { stack: tip.n, cat: cardCategoryOf(tip.d.split('\n')) })
    }
    cardFacts.value = out
  }).catch(() => { loading = null })
  return loading
}
