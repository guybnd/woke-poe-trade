// The words and dots for a section's state (Guy's W1, 2026-11-28): Hide /
// By price / Always, on the Loot tab's state chips and the Alt+F card.
import type { ChipOption } from './StateChip.vue'

export const SECTION_MODES: ChipOption[] = [
  { value: 'off', label: 'Hide', desc: 'Hidden in maps (area level 68+).', dot: 'var(--w-faint)', hollow: true },
  { value: 'auto', label: 'By price', desc: 'Its price × stack picks the step.', dot: 'var(--w-gold)' },
  { value: 'always', label: 'Always', desc: 'Shows at least Small, whatever the price.', dot: 'var(--w-gold-hi)', glow: true }
]
// One item on the Alt+F card.
export const ITEM_MODES = [{ value: 'auto', label: 'Same as section' }, { value: 'off', label: 'Hide' }, { value: 'always', label: 'Always' }]
