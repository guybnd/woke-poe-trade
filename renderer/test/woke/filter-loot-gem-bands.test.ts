// Gem folds split by level and quality, corrupted first (Guy 2026-11-28: "these sections very dense").
import { it, expect } from 'vitest'
import { subgroupOf } from '@/web/woke/loot-filter/currency-weights'
it('bands', () => {
  expect(['Arc 1', 'Arc 1/20', 'Arc 20', 'Arc 20/20', 'Arc 20/20c', 'Arc 21c', 'Arc 21/20c', 'Arc 21/23c', 'Arc 20/23c'].map(n => subgroupOf(n, 'gemskill')))
    .toEqual(['1/0+', '1/20', '20/0', '20/20', 'Corrupted · 20/20', 'Corrupted · 21/20', 'Corrupted · 21/20', 'Corrupted · 21/23', 'Corrupted · 20/23'])
  expect(['Vaal Grace 20/20c', 'Vaal Grace 21/20c'].map(n => subgroupOf(n, 'gemvaal'))).toEqual(['20/20', '21/20'])
  expect(subgroupOf('Enlighten Support 4/20c', 'gemexc')).toBe(null)
})
