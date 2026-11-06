// Item data is checked every 30 minutes in a league's first two weeks, else every 6 hours.
import { describe, expect, it, vi } from 'vitest'
vi.mock('@/web/background/IPC', () => ({ MainProcess: { isElectron: false } }))
vi.mock('@/assets/data', () => ({ useLiveData: () => {} }))
vi.mock('@/web/woke/shared/host', () => ({ hostRequest: async () => null }))
// eslint-disable-next-line import/first
import { checkDelay, dataFileUrl } from '@/web/woke/app/live-data'

const DAY = 24 * 3600e3
const NOW = Date.parse('2026-12-05T20:00:00Z')

describe('checkDelay', () => {
  it('checks often in the first two weeks', () => {
    expect(checkDelay(NOW - 2 * DAY, NOW)).toBe(30 * 60e3)
    expect(checkDelay(NOW - 13.9 * DAY, NOW)).toBe(30 * 60e3)
  })
  it('goes back to every 6 hours after that, or with no start date', () => {
    expect(checkDelay(NOW - 15 * DAY, NOW)).toBe(6 * 3600e3)
    expect(checkDelay(null, NOW)).toBe(6 * 3600e3)
    expect(checkDelay(NOW + DAY, NOW)).toBe(6 * 3600e3)
  })
  it('reads the app\'s own files until a download has newer ones', () => {
    expect(dataFileUrl('tree/passive-tree.json')).toMatch(/data\/tree\/passive-tree\.json$/)
  })
})
