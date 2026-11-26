// The trade site's link for one Foulborn kind (unique-info.ts), listed as the
// price check lists. Loaded on the click, not with the side list.
import { STAT_BY_MATCH_STR_V2 } from '@/assets/data'
import { tradeUrl } from '../search/search'
import { priceCheckTradeStatus } from '../shared/trade-status'
import { foulKindQuery, statMatchTexts } from './unique-info'

// The explicit trade id for a mod's text. A group whose stats share the
// matcher (local and global attack speed, Intensify) gives its first that
// trades as an explicit.
function explicitId (text: string): string | null {
  for (const match of statMatchTexts(text)) {
    const found = STAT_BY_MATCH_STR_V2(match)
    if (!found) continue
    const stats = 'stats' in found ? found.stats : [found]
    for (const stat of stats) {
      if (!stat.matchers.some(m => m.string === match || m.advanced === match)) continue
      const id = stat.trade.ids.explicit?.[0]
      if (id) return id
    }
  }
  return null
}

export function foulKindUrl (league: string, host: string, base: { name: string, type?: string }, adds: string[]): string {
  const query = foulKindQuery(base, adds, explicitId)
  return tradeUrl(league, { ...query, status: priceCheckTradeStatus() }, host)
}
