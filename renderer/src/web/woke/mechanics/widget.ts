import type { Widget, Anchor } from '@/web/overlay/widgets'

export const MECHANICS_TYPE = 'woke-mechanics'

export interface MechanicsWidget extends Widget {
  anchor: Anchor
  // Selected mechanic id.
  tab: string
  // false: small icon that shows a glance card on hover; true: full view.
  expanded: boolean
  // Switch tabs when entering a mechanic's zone (Client.txt).
  autoSwitch: boolean
  // Mechanic ids hidden from the tab list.
  hidden: string[]
  // Starred Betrayal slots ("Member|divisionIndex").
  betrayalStars: string[]
  // User overrides of Betrayal reward text, by slot key.
  betrayalOverrides: Record<string, string>
  // Where each Syndicate member is now (division index), set by the player.
  betrayalAt?: Record<string, number>
  // Leave thin-market prices out of the lists and the Best pick (unset: on).
  skipThin?: boolean
  // The icon's position was checked against the stash area once.
  posChecked?: boolean
}
