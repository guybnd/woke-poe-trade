// Net worth's saved divine rate for each day it read your stash, for the
// sales views: a sale in divines is worth that day's rate, not today's.
// store.ts writes it whenever its history changes. Tiny on purpose: the
// sales views read it without loading the whole Net worth store.
import { shallowRef } from 'vue'
import type { DaySnapshot } from './valuation'

export const divineDays = shallowRef<{ league: string | null, days: Record<string, Pick<DaySnapshot, 'at' | 'divine'>> }>({ league: null, days: {} })
