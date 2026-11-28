// Gem folds split by level and quality (Guy 2026-11-28: "these sections very dense").
import { it, expect } from 'vitest'
import { subgroupOf } from '@/web/woke/loot-filter/currency-weights'
it('bands', () => {
  expect(['Arc 1', 'Arc 1/20', 'Arc 20', 'Arc 20/20', 'Arc 20/20c', 'Arc 21c', 'Arc 21/20c', 'Arc 21/23c', 'Arc 20/23c'].map(n => subgroupOf(n, 'gemskill')))
    .toEqual(['1/0+', '1/20', '20/0', '20/20', 'Corrupted, no change', '21/20', '21/20', '21/23', '20/23'])
  expect(subgroupOf('Vaal Grace 20/20c', 'gemvaal')).toBe('20/20')
  expect(subgroupOf('Enlighten Support 4/20c', 'gemexc')).toBe(null)
})
