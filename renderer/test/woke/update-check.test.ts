// The "Check for updates" result line (settings/update-check.ts).
import { describe, it, expect } from 'vitest'
import { checkLine } from '@/web/woke/settings/update-check'

describe('checkLine', () => {
  it('says each result plainly', () => {
    expect(checkLine({ kind: 'up-to-date', current: '1.2.3' })).toEqual({ text: 'Up to date (1.2.3).', link: null, tone: 'ok' })
    expect(checkLine({ kind: 'available', current: '1.2.3', version: '1.2.4', url: 'https://github.com/x' }))
      .toEqual({ text: '1.2.4 available.', link: { label: 'Download', url: 'https://github.com/x' }, tone: 'new' })
    expect(checkLine({ kind: 'downloading', current: '1.2.3', version: '1.2.4' }).text).toBe('Downloading 1.2.4.')
    expect(checkLine({ kind: 'downloaded', current: '1.2.3', version: '1.2.4', whenClosed: false }).text).toBe('1.2.4 will install when you quit.')
    expect(checkLine({ kind: 'downloaded', current: '1.2.3', version: '1.2.4', whenClosed: true }).text).toMatch(/Path of Exile is closed/)
    expect(checkLine({ kind: 'up-to-date', current: '1.2.3', skipped: '1.2.4' }).text).toBe('Up to date (1.2.3). Skipping 1.2.4: you went back from it.')
    expect(checkLine({ kind: 'downloaded', current: '1.2.3', version: '1.2.4', whenClosed: false, blocked: true }).text).toMatch(/waits while going back/)
    expect(checkLine({ kind: 'error', current: '1.2.3', message: 'Offline.' })).toEqual({ text: 'Offline.', link: null, tone: 'error' })
  })
})
