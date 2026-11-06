// main/src/woke/live-data.ts: only verified, newer data ever lands on disk.
import { describe, it, expect, beforeEach } from 'vitest'
import { createHash } from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { cachedLiveData, checkLiveData, liveDataRoot } from '../../main/src/woke/live-data'

const sha = (text: string) => createHash('sha256').update(text).digest('hex')
const ITEMS = '{"name":"New"}\n'
const STATS = '{"ref":"new"}\n'

function site (over: { version?: number, format?: number, items?: string, itemsHash?: string, status?: number } = {}) {
  const manifest = {
    format: over.format ?? 1,
    version: over.version ?? 5,
    files: { en: { items: over.itemsHash ?? sha(ITEMS), stats: sha(STATS) } }
  }
  const asked: string[] = []
  const fetcher = async (url: string) => {
    asked.push(url)
    const body = url.endsWith('data-version.json') ? JSON.stringify(manifest)
      : url.endsWith('items.ndjson') ? (over.items ?? ITEMS)
        : STATS
    return { ok: (over.status ?? 200) === 200, status: over.status ?? 200, text: async () => body }
  }
  return { fetcher, asked }
}

const onDisk = (name: string) => fs.readFileSync(path.join(liveDataRoot(), 'en', name), 'utf8')
const hasData = () => fs.existsSync(path.join(liveDataRoot(), 'en'))

beforeEach(() => {
  process.env.WOKE_FAKE_USER_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-live-'))
})

describe('checkLiveData', () => {
  it('downloads newer data, and later runs find it', async () => {
    const { fetcher, asked } = site()
    expect(await checkLiveData({ language: 'en', bundled: 3 }, fetcher)).toBe(5)
    expect(onDisk('items.ndjson')).toBe(ITEMS)
    expect(onDisk('stats.ndjson')).toBe(STATS)
    expect(asked.every(u => u.startsWith('https://raw.githubusercontent.com/guybnd/woke-poe-trade/master/'))).toBe(true)
    expect(await cachedLiveData({ language: 'en', bundled: 3 })).toBe(5)
  })

  it('downloads nothing when the app\'s data is as new', async () => {
    const { fetcher, asked } = site({ version: 3 })
    expect(await checkLiveData({ language: 'en', bundled: 3 }, fetcher)).toBeNull()
    expect(asked).toHaveLength(1)
    expect(hasData()).toBe(false)
  })

  it('doesn\'t download the same version twice', async () => {
    await checkLiveData({ language: 'en', bundled: 3 }, site().fetcher)
    const again = site()
    expect(await checkLiveData({ language: 'en', bundled: 3 }, again.fetcher)).toBe(5)
    expect(again.asked).toHaveLength(1)
  })

  it('refuses a file that doesn\'t match its hash, and keeps what it had', async () => {
    await checkLiveData({ language: 'en', bundled: 3 }, site().fetcher)
    await expect(checkLiveData({ language: 'en', bundled: 3 }, site({ version: 6, items: 'tampered\n' }).fetcher)).rejects.toThrow('hash')
    expect(onDisk('items.ndjson')).toBe(ITEMS)
    expect(await cachedLiveData({ language: 'en', bundled: 3 })).toBe(5)
  })

  it('leaves a format this app doesn\'t know for the next release', async () => {
    const { fetcher, asked } = site({ format: 2 })
    expect(await checkLiveData({ language: 'en', bundled: 3 }, fetcher)).toBeNull()
    expect(asked).toHaveLength(1)
  })

  it('refuses a version file it can\'t use', async () => {
    const asked: string[] = []
    const bad = (body: string) => async (url: string) => {
      asked.push(url)
      return { ok: true, status: 200, text: async () => body }
    }
    await expect(checkLiveData({ language: 'en', bundled: 3 }, bad('{"format":1,"version":"9","files":{"en":{"items":"a","stats":"b"}}}'))).rejects.toThrow('not usable')
    await expect(checkLiveData({ language: 'en', bundled: 3 }, bad('null'))).rejects.toThrow('not usable')
    await expect(checkLiveData({ language: 'ko', bundled: 3 }, bad('{"format":1,"version":9,"files":{"en":{"items":"a","stats":"b"}}}'))).rejects.toThrow('not usable')
    expect(asked).toHaveLength(3)
  })

  it('a check for one language doesn\'t answer for another', async () => {
    const hold = new Promise<void>(() => {})
    const stuck = async () => { await hold; throw new Error('never') }
    void checkLiveData({ language: 'ru', bundled: 3 }, stuck)
    expect(await checkLiveData({ language: 'en', bundled: 3 }, site().fetcher)).toBe(5)
  })

  it('a new version replaces the old set whole, leaving nothing behind', async () => {
    await checkLiveData({ language: 'en', bundled: 3 }, site().fetcher)
    expect(await checkLiveData({ language: 'en', bundled: 3 }, site({ version: 6 }).fetcher)).toBe(6)
    expect(fs.readdirSync(liveDataRoot())).toEqual(['en'])
    expect(await cachedLiveData({ language: 'en', bundled: 3 })).toBe(6)
  })

  it('reports a failed download without touching anything', async () => {
    await expect(checkLiveData({ language: 'en', bundled: 3 }, site({ status: 500 }).fetcher)).rejects.toThrow('500')
    expect(hasData()).toBe(false)
  })

  it.each([['../evil'], ['de'], [undefined]])('refuses the language %j', async (language) => {
    expect(() => checkLiveData({ language, bundled: 3 }, site().fetcher)).toThrow('Unknown language')
    await expect(cachedLiveData({ language, bundled: 3 })).rejects.toThrow('Unknown language')
  })
})

describe('cachedLiveData', () => {
  it('drops a download once an app update brings data as new', async () => {
    await checkLiveData({ language: 'en', bundled: 3 }, site().fetcher)
    expect(await cachedLiveData({ language: 'en', bundled: 5 })).toBeNull()
    expect(hasData()).toBe(false)
  })

  it('has nothing to offer on a fresh install', async () => {
    expect(await cachedLiveData({ language: 'en', bundled: 3 })).toBeNull()
  })
})

describe('tooltips and the passive tree', () => {
  const TIPS = '{"Mirror":"new"}'
  const TREE = '{"nodes":[]}'
  function sharedSite (over: { tree?: string, version?: number } = {}) {
    const manifest = {
      format: 1,
      version: over.version ?? 5,
      files: { en: { items: sha(ITEMS), stats: sha(STATS) } },
      shared: { 'tips/uniques.json': sha(TIPS), 'tree/passive-tree.json': sha(TREE), '../evil.json': sha('x') }
    }
    const asked: string[] = []
    const fetcher = async (url: string) => {
      asked.push(url)
      const body = url.endsWith('data-version.json') ? JSON.stringify(manifest)
        : url.endsWith('items.ndjson') ? ITEMS
          : url.endsWith('stats.ndjson') ? STATS
            : url.endsWith('uniques.json') ? TIPS
              : url.endsWith('passive-tree.json') ? (over.tree ?? TREE)
                : 'x'
      return { ok: true, status: 200, text: async () => body }
    }
    return { fetcher, asked }
  }

  it('downloads only those that differ from the app\'s own, and lists them', async () => {
    const { fetcher, asked } = sharedSite()
    expect(await checkLiveData({ language: 'en', bundled: 3, bundledShared: { 'tree/passive-tree.json': sha(TREE) } }, fetcher)).toBe(5)
    expect(onDisk('tips/uniques.json')).toBe(TIPS)
    expect(fs.existsSync(path.join(liveDataRoot(), 'en', 'tree'))).toBe(false)
    expect(JSON.parse(onDisk('shared.json'))).toEqual(['tips/uniques.json'])
    // A name outside the fixed list is never fetched.
    expect(asked.some(u => u.includes('evil'))).toBe(false)
  })

  it('reuses the last download\'s copy for the next version', async () => {
    await checkLiveData({ language: 'en', bundled: 3 }, sharedSite().fetcher)
    const next = sharedSite({ version: 6 })
    expect(await checkLiveData({ language: 'en', bundled: 3 }, next.fetcher)).toBe(6)
    expect(next.asked.some(u => u.endsWith('.json') && !u.endsWith('data-version.json'))).toBe(false)
    expect(onDisk('tree/passive-tree.json')).toBe(TREE)
  })

  it('refuses a tree that doesn\'t match its hash, and keeps what it had', async () => {
    await checkLiveData({ language: 'en', bundled: 3 }, site().fetcher)
    await expect(checkLiveData({ language: 'en', bundled: 3 }, sharedSite({ version: 6, tree: 'tampered' }).fetcher)).rejects.toThrow('hash')
    expect(await cachedLiveData({ language: 'en', bundled: 3 })).toBe(5)
  })
})
