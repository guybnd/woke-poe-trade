// main/src/woke/crash-reports.ts: the pre-filled public issue must not carry
// the player's Windows user name.
import { describe, it, expect } from 'vitest'
import { issueUrl, scrubText, type CrashReport } from '../../main/src/woke/crash-reports'

const names = { home: 'C:\\Users\\Guy-Desktop', user: 'Guy-Desktop' }

describe('scrubText', () => {
  it('replaces the home folder, either slash, any case', () => {
    expect(scrubText('at C:\\Users\\Guy-Desktop\\AppData\\Roaming\\x.json', names)).toBe('at ~\\AppData\\Roaming\\x.json')
    expect(scrubText('at c:/users/guy-desktop/AppData/x.json', names)).toBe('at ~/AppData/x.json')
  })
  it('hides other user folders and the bare user name', () => {
    expect(scrubText('read D:\\x and C:\\Users\\Someone\\Documents\\My Games', names)).toBe('read D:\\x and C:\\Users\\<user>\\Documents\\My Games')
    expect(scrubText('owner Guy-Desktop denied', names)).toBe('owner <user> denied')
    expect(scrubText('/home/alice/.config/x', {})).toBe('/home/<user>/.config/x')
  })
  it('leaves ordinary text alone', () => {
    expect(scrubText('error [cors-proxy] timeout (poe.ninja)', names)).toBe('error [cors-proxy] timeout (poe.ninja)')
  })
})

describe('issueUrl', () => {
  it('scrubs every part of the report', () => {
    const r: CrashReport = {
      id: '1', at: 0, kind: 'main-error', title: 'ENOENT C:\\Users\\Guy-Desktop\\a', detail: 'stack C:\\Users\\Guy-Desktop\\b',
      version: '0.3.0', electron: '40', os: 'Windows', log: 'log C:\\Users\\Guy-Desktop\\c',
      rendererErrors: ['err C:\\Users\\Guy-Desktop\\d'], session: 0, seen: false
    }
    const body = decodeURIComponent(issueUrl(r, 'ctx Guy-Desktop', names).replace(/\+/g, ' '))
    expect(body).not.toMatch(/guy-desktop/i)
    expect(body).toContain('~\\a')
    expect(body).toContain('~\\d')
  })
})
