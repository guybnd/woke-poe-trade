// Which unique an unidentified one is, from its art: the stash API names an
// unidentified unique only by its base, but its icon is the unique's own.
// Two uniques with the same art on one base (a Replica and its original)
// can't be told apart: null.
import { ITEM_BY_REF } from '@/assets/data'
import { uniquesOnBase } from './uniques-on-base'

/** "…/PuzzlePieceJewel_CleansingFire.png?x=1" -> "puzzlepiecejewel_cleansingfire.png" */
export function artFile (icon: string): string {
  const path = icon.split('?')[0]
  return path.slice(path.lastIndexOf('/') + 1).toLowerCase()
}

export function uniqueFromArt (
  base: string,
  icon: string,
  onBase: (base: string) => string[] = uniquesOnBase,
  iconOf: (name: string) => string | undefined = name => ITEM_BY_REF('UNIQUE', name)?.[0]?.icon
): string | null {
  const file = artFile(icon)
  if (!file) return null
  const found = onBase(base).filter(name => {
    const art = iconOf(name)
    return art != null && artFile(art) === file
  })
  return found.length === 1 ? found[0] : null
}
