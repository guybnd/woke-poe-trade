// "Check for updates" (main/src/woke/update-check.ts): electron-updater's state
// for an installed build, GitHub's latest release for one that updates by hand.
import { describe, it, expect } from 'vitest'
import { checkLatestRelease, fromLatestRelease, fromUpdaterInfo, LATEST_URL, releasePage } from '../../main/src/woke/update-check'

const CUR = '1.330.12'

describe('fromUpdaterInfo', () => {
  it('maps each updater state', () => {
    expect(fromUpdaterInfo({ state: 'update-not-available', checkedAt: 1 }, CUR)).toEqual({ kind: 'up-to-date', current: CUR })
    expect(fromUpdaterInfo({ state: 'update-available', version: '1.330.13', noDownloadReason: null }, CUR))
      .toEqual({ kind: 'downloading', current: CUR, version: '1.330.13' })
    expect(fromUpdaterInfo({ state: 'update-available', version: '1.330.13', noDownloadReason: 'disabled-by-flag' }, CUR))
      .toEqual({ kind: 'available', current: CUR, version: '1.330.13', url: releasePage('1.330.13') })
    expect(fromUpdaterInfo({ state: 'update-downloaded', version: '1.330.13', whenClosed: true }, CUR))
      .toEqual({ kind: 'downloaded', current: CUR, version: '1.330.13', whenClosed: true })
    expect(fromUpdaterInfo({ state: 'update-downloaded', version: '1.330.13' }, CUR))
      .toMatchObject({ kind: 'downloaded', whenClosed: false })
    expect(fromUpdaterInfo({ state: 'error', checkedAt: 1 }, CUR).kind).toBe('error')
    expect(fromUpdaterInfo({ state: 'checking-for-update' }, CUR).kind).toBe('error')
  })

  it('names a skipped version and a download held by going back', () => {
    expect(fromUpdaterInfo({ state: 'update-not-available', checkedAt: 1 }, CUR, '1.330.13'))
      .toEqual({ kind: 'up-to-date', current: CUR, skipped: '1.330.13' })
    expect(fromUpdaterInfo({ state: 'update-downloaded', version: '1.330.13', whenClosed: true, blocked: true }, CUR))
      .toEqual({ kind: 'downloaded', current: CUR, version: '1.330.13', whenClosed: false, blocked: true })
    expect(fromUpdaterInfo({ state: 'error', checkedAt: 1 }, CUR)).toMatchObject({ message: expect.not.stringMatching(/GitHub/) })
  })
})

describe('fromLatestRelease', () => {
  const ok = (tag: string, html?: string) => ({ status: 200, body: { tag_name: tag, html_url: html } })

  it('is up to date on the same or an older release', () => {
    expect(fromLatestRelease(ok('v1.330.12'), CUR)).toEqual({ kind: 'up-to-date', current: CUR })
    expect(fromLatestRelease(ok('v1.330.9'), CUR).kind).toBe('up-to-date')
  })

  it('compares numerically, not as text', () => {
    expect(fromLatestRelease(ok('v1.330.100'), '1.330.99').kind).toBe('available')
    expect(fromLatestRelease(ok('v1.331.0'), CUR)).toMatchObject({ kind: 'available', version: '1.331.0' })
  })

  it('links only to the repo release page', () => {
    const page = 'https://github.com/guybnd/woke-poe-trade/releases/tag/v1.330.13'
    expect(fromLatestRelease(ok('v1.330.13', page), CUR)).toMatchObject({ url: page })
    expect(fromLatestRelease(ok('v1.330.13', 'https://evil.example/x'), CUR)).toMatchObject({ url: page })
    expect(fromLatestRelease(ok('1.330.13'), CUR)).toMatchObject({ url: page })
  })

  it('treats a development version that does not parse as older', () => {
    expect(fromLatestRelease(ok('v1.330.13'), '0.0.0-test').kind).toBe('available')
  })

  it('says why on errors', () => {
    expect(fromLatestRelease({ status: 403, body: null }, CUR)).toMatchObject({ kind: 'error', message: expect.stringMatching(/limiting/) })
    expect(fromLatestRelease({ status: 429, body: null }, CUR)).toMatchObject({ kind: 'error', message: expect.stringMatching(/limiting/) })
    expect(fromLatestRelease({ status: 404, body: null }, CUR)).toMatchObject({ kind: 'error' })
    expect(fromLatestRelease({ status: 500, body: null }, CUR)).toMatchObject({ kind: 'error', message: expect.stringMatching(/500/) })
    expect(fromLatestRelease(ok('nightly'), CUR).kind).toBe('error')
    expect(fromLatestRelease({ status: 200, body: null }, CUR).kind).toBe('error')
  })
})

describe('checkLatestRelease', () => {
  it('asks GitHub for the latest release', async () => {
    const urls: string[] = []
    const r = await checkLatestRelease(CUR, async (url) => {
      urls.push(url)
      return { status: 200, json: async () => ({ tag_name: 'v1.330.13' }) }
    })
    expect(urls).toEqual([LATEST_URL])
    expect(r).toMatchObject({ kind: 'available', version: '1.330.13' })
  })

  it('reports offline and unreadable answers', async () => {
    expect((await checkLatestRelease(CUR, async () => { throw new Error('ENOTFOUND') })).kind).toBe('error')
    expect((await checkLatestRelease(CUR, async () => ({ status: 200, json: async () => { throw new SyntaxError('bad') } }))).kind).toBe('error')
    expect(await checkLatestRelease(CUR, async () => ({ status: 403, json: async () => { throw new Error('not read') } })))
      .toMatchObject({ kind: 'error', message: expect.stringMatching(/limiting/) })
  })
})
