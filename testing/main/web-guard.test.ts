// main/src/woke/web-guard.ts: links leave the app only as web addresses, and
// sites in a webview get no special permissions.
import { describe, it, expect, vi } from 'vitest'
import { allowPermission, isOwnPage, isWebUrl, isWebviewSrc, openWebLink } from '../../main/src/woke/web-guard'

describe('isWebUrl', () => {
  it.each([
    'https://poe.ninja/economy',
    'http://localhost:8585/index.html',
    'HTTPS://www.pathofexile.com/trade'
  ])('allows %s', (url) => {
    expect(isWebUrl(url)).toBe(true)
  })

  it.each([
    'file:///C:/Windows/System32/calc.exe',
    'ms-msdt:/id PCWDiagnostic',
    'javascript:alert(1)',
    'search-ms:query=x',
    '\\\\server\\share\\evil.exe',
    'C:\\evil.exe',
    '',
    'not a url',
    null,
    42
  ])('refuses %j', (url) => {
    expect(isWebUrl(url)).toBe(false)
  })
})

describe('isWebviewSrc', () => {
  it('lets a webview start blank or on a web page', () => {
    expect(isWebviewSrc('')).toBe(true)
    expect(isWebviewSrc(undefined)).toBe(true)
    expect(isWebviewSrc('about:blank')).toBe(true)
    expect(isWebviewSrc('https://www.poelab.com/')).toBe(true)
  })
  it('keeps files and other protocols out', () => {
    expect(isWebviewSrc('file:///C:/Users/x/AppData/Roaming/woke-poe-trade/apt-data/config.json')).toBe(false)
    expect(isWebviewSrc('chrome://gpu')).toBe(false)
    expect(isWebviewSrc('devtools://devtools/bundled/inspector.html')).toBe(false)
  })
})

describe('isOwnPage', () => {
  it('is the local server on loopback', () => {
    expect(isOwnPage('http://localhost:8585/index.html')).toBe(true)
    expect(isOwnPage('http://127.0.0.1:51234/')).toBe(true)
  })
  it('is the dev server in dev mode', () => {
    expect(isOwnPage('http://192.168.1.5:5173/', 'http://192.168.1.5:5173')).toBe(true)
  })
  it('is never another site', () => {
    expect(isOwnPage('https://wealthyexile.com/')).toBe(false)
    expect(isOwnPage('https://localhost.evil.com/')).toBe(false)
    expect(isOwnPage('file:///index.html')).toBe(false)
    expect(isOwnPage(undefined)).toBe(false)
  })
})

describe('allowPermission', () => {
  it('lets the overlay show notifications and anyone copy', () => {
    expect(allowPermission('notifications', 'http://localhost:8585/index.html')).toBe(true)
    expect(allowPermission('clipboard-sanitized-write', 'https://poedb.tw/')).toBe(true)
  })
  it('refuses sites in a webview anything sensitive', () => {
    for (const p of ['media', 'geolocation', 'notifications', 'clipboard-read', 'hid', 'usb', 'serial', 'openExternal', 'pointerLock']) {
      expect(allowPermission(p, 'https://wealthyexile.com/')).toBe(false)
    }
  })
})

describe('openWebLink', () => {
  it('opens web links and drops the rest', () => {
    const open = vi.fn()
    expect(openWebLink(open, 'https://www.poewiki.net/wiki/Mirror')).toBe(true)
    expect(openWebLink(open, 'file:///C:/evil.exe')).toBe(false)
    expect(open).toHaveBeenCalledTimes(1)
    expect(open).toHaveBeenCalledWith('https://www.poewiki.net/wiki/Mirror')
  })
})
