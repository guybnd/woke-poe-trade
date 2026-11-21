// The price check's listing setting, for trade links opened outside it.
import { AppConfig } from '@/web/Config'
import type { PriceCheckWidget } from '@/web/overlay/widgets'
import { tradeStatusFor } from '../search/search'

export function priceCheckTradeStatus (info?: { exchangeable?: true, tradeTag?: string }): { option: 'securable' | 'available' } {
  return { option: tradeStatusFor(AppConfig<PriceCheckWidget>('price-check')?.merchantOnly, info) }
}
