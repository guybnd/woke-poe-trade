// Gem icons: the item data's art, as every item row gets it (ui/game-icons).
import { gameIcon } from '../ui/game-icons'

export function gemIcon (name: string): string | null {
  return gameIcon(name, 'GEM')
}
