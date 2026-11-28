// The words and dots for a section's state (Guy's W1, 2026-11-28; words
// Guy 2026-11-28 "just saying always is not very clear"): Always hide /
// By price estimate / Always show, on the Loot tab's state chips and the
// Alt+F card.
import type { ChipOption } from './StateChip.vue'

export const MODE_WORDS = { off: 'Always hide', auto: 'By price estimate', always: 'Always show' } as const

export const SECTION_MODES: ChipOption[] = [
  { value: 'off', label: MODE_WORDS.off, desc: 'Hidden in maps (area level 68+).', dot: 'var(--w-faint)', hollow: true },
  { value: 'auto', label: MODE_WORDS.auto, desc: 'Its price × stack picks the step.', dot: 'var(--w-gold)' },
  { value: 'always', label: MODE_WORDS.always, desc: 'Shows as at least Small, whatever the price.', dot: 'var(--w-up, #6fbf5a)', glow: true }
]
// One item on the Alt+F card.
export const ITEM_MODES = [{ value: 'auto', label: 'Same as section' }, { value: 'off', label: MODE_WORDS.off }, { value: 'always', label: MODE_WORDS.always }]
