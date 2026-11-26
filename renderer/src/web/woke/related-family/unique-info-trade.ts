// The trade site's link for one Foulborn kind (unique-info.ts), listed as the
// price check lists. Loaded on the click, not with the side list.
import { STAT_BY_MATCH_STR } from '@/assets/data'
import { tradeUrl } from '../search/search'
import { priceCheckTradeStatus } from '../shared/trade-status'
import { foulKindQuery, statMatchText } from './unique-info'

export function foulKindUrl (league: string, host: string, base: { name: string, type?: string }, adds: string[]): string {
  const query = foulKindQuery(base, adds, line => STAT_BY_MATCH_STR(statMatchText(line))?.stat.trade.ids.explicit?.[0] ?? null)
  return tradeUrl(league, { ...query, status: priceCheckTradeStatus() }, host)
}
