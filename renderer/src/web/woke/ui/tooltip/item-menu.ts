// The right-click menu of any item that shows a game tooltip (pick C): the
// item's name, art and price at the top, then a strip of icon buttons: price
// check, trade site, wiki, copy name, find in stash, watch price. A screen's own
// row menu (openMenu) gets the strip on top of its entries; an item with no
// row menu gets the strip alone.
//
// v-item-tip offers its item by itself. Places with their own tooltip (build
// gear and gems, trade listings) call offerItem / openItemMenu.
import { createVirtualItem, ItemRarity } from '@/parser/ParsedItem'
import { AppConfig } from '@/web/Config'
import { Host } from '@/web/background/IPC'
import { useLeagues } from '@/web/background/Leagues'
import { usePoeninja } from '@/web/background/Prices'
import { getTradeEndpoint } from '@/web/price-check/trade/common'
import { lookupRequest } from '../../item-lookup/lookup'
import { MARKET_TRACKER_TYPE } from '../../market/widget'
import type { MarketTrackerWidget } from '../../market/widget'
import { isWidgetTypeOn } from '../../modules'
import { itemKey } from '../../market/types'
import { tradeUrl } from '../../search/search'
import { copyText } from '../copy'
import { formatChaos } from '../format'
import { gameIcon } from '../game-icons'
import { offerMenuItem, openMenu, toast } from '../layer'
import type { MenuItemAction, MenuItemHead } from '../layer'
import { hideTip } from './tooltip'
import { marketFor } from './item-tip'
import { NS, infoOf, kindOf, nameClass, plainName, priceCheckInput, tradeQuery } from './item-menu-logic'
import type { ItemMenuRef } from './item-menu-logic'

export type { ItemMenuRef } from './item-menu-logic'

// ---- Market watchlist ----

function marketTracker (): MarketTrackerWidget | undefined {
  const config = AppConfig()
  if (!isWidgetTypeOn(config, MARKET_TRACKER_TYPE)) return undefined
  return config.widgets.find(w => w.wmType === MARKET_TRACKER_TYPE) as MarketTrackerWidget | undefined
}

// ---- the menu ----

function screenPoint (e: MouseEvent) {
  return { x: e.screenX, y: e.screenY }
}

export function itemMenuHead (ref: ItemMenuRef, at: MouseEvent): MenuItemHead | null {
  if (!ref.name) return null
  const kind = kindOf(ref)
  const info = infoOf(ref, kind)
  const pos = screenPoint(at)

  const market = ref.noPrice || ref.text ? null : marketFor({ name: ref.name, type: ref.type, variant: ref.variant }, kind)
  const divine = usePoeninja().xchgRate.value
  const price = market ? formatChaos(market.chaos, divine) : undefined

  const check = priceCheckInput(ref, kind, info, AppConfig().language === 'en')
  const actions: MenuItemAction[] = [
    {
      label: 'Price',
      title: 'Price check',
      icon: 'fas fa-balance-scale',
      disabled: !check,
      action: () => {
        if (!check) return
        hideTip()
        Host.selfDispatch({
          name: 'MAIN->CLIENT::item-text',
          payload: { clipboard: check.clipboard, item: check.item, position: pos, focusOverlay: true, target: 'price-check' }
        })
      }
    },
    {
      label: 'Trade',
      title: 'Open on the trade site',
      icon: 'fas fa-external-link-alt',
      action: () => {
        const league = useLeagues().selectedId.value
        if (!league) { toast('Pick a league in the settings first'); return }
        window.open(tradeUrl(league, tradeQuery(ref, kind, info, AppConfig().language === 'en'), getTradeEndpoint()))
      }
    },
    {
      label: 'Wiki',
      title: 'Open the wiki in the overlay',
      icon: 'fas fa-book-open',
      action: () => {
        hideTip()
        if (info) {
          const rarity = kind === 'unique' ? ItemRarity.Unique : ItemRarity.Normal
          lookupRequest.value = { item: createVirtualItem({ rarity, info }), tab: 'wiki', position: pos }
        } else {
          window.open(`https://www.poewiki.net/wiki/${encodeURIComponent((ref.base ?? ref.name).replaceAll(' ', '_'))}`)
        }
      }
    },
    {
      label: 'Copy',
      title: 'Copy the name',
      icon: 'far fa-copy',
      action: () => { copyText(ref.name).then(ok => { if (ok) toast(`Copied "${ref.name}"`, { ms: 1800 }) }) }
    }
  ]
  if (ref.text) {
    const text = ref.text
    actions.push({
      label: 'Text',
      title: 'Copy the item text (paste into PoB or the trade site)',
      icon: 'fas fa-paste',
      action: () => { copyText(text).then(ok => { if (ok) toast('Copied the item text', { ms: 1800 }) }) }
    })
  }
  actions.push({
    label: 'Stash',
    title: 'Find in your stash',
    icon: 'fas fa-search',
    action: () => {
      Host.sendEvent({ name: 'CLIENT->MAIN::user-action', payload: { action: 'stash-search', text: JSON.stringify(ref.name) } })
    }
  })

  const tracker = marketTracker()
  // Market keeps its own Watch nowhere else, so this shows before prices load.
  if (tracker && ref.type) {
    const entry = { type: ref.type, name: ref.name, variant: ref.variant || '' }
    const watched = (tracker.watchlist ?? []).some(w => itemKey(w) === itemKey(entry))
    actions.push({
      label: watched ? 'Unwatch' : 'Watch',
      title: watched ? 'Stop watching its price in Market' : 'Watch its price in Market',
      icon: watched ? 'fas fa-star' : 'far fa-star',
      action: () => {
        const before = tracker.watchlist ?? []
        tracker.watchlist = watched
          ? before.filter(w => itemKey(w) !== itemKey(entry))
          : [...before, entry]
        // Undo puts back its price alerts too.
        toast(watched ? `Stopped watching ${ref.name}` : `Watching ${ref.name} in Market`, { undo: () => { tracker.watchlist = before } })
      }
    })
  }

  return {
    name: ref.name,
    nameClass: nameClass(ref, kind, info),
    art: info?.icon ?? gameIcon(plainName(ref.name), NS[kind]),
    price,
    actions
  }
}

// For a control with its own tooltip: the menu this right-click opens (the
// row's, or none) shows the item. Call from @contextmenu.capture.
export function offerItem (e: MouseEvent, ref: ItemMenuRef | null | undefined) {
  if (ref?.name) offerMenuItem(e, () => itemMenuHead(ref, e))
}

// The item's menu alone, where nothing else on the row has one.
export function openItemMenu (e: MouseEvent, ref: ItemMenuRef | null | undefined) {
  if (!ref?.name || e.defaultPrevented) return
  const head = itemMenuHead(ref, e)
  if (head) openMenu(e, [], head)
}
