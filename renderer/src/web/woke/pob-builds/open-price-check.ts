import { Host } from '@/web/background/IPC'
import { hideTip } from '../ui/tooltip/tooltip'
import { pobItemText } from './item-text'
import type { PobItem } from './widget'

// Opens the price check on a build's item, from the control that was clicked.
export function openPriceCheck (item: PobItem, e: MouseEvent) {
  hideTip()
  const from = (e.currentTarget as HTMLElement).getBoundingClientRect()
  Host.selfDispatch({
    name: 'MAIN->CLIENT::item-text',
    payload: {
      clipboard: pobItemText(item),
      position: {
        x: window.screenX + from.x + from.width / 2,
        y: window.screenY + from.y + from.height / 2
      },
      focusOverlay: true,
      target: 'price-check'
    }
  })
}
