// main/src/host-files/GameLogWatcher.ts: following Client.txt must survive the
// file being cleared, replaced or deleted, with no restart.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { GameLogWatcher, startOffset } from '../../main/src/host-files/GameLogWatcher'

let dir: string
let file: string
let lines: string[]
let watcher: GameLogWatcher

// Generous: other test files share the machine, and the watcher polls.
const until = async (check: () => boolean, ms = 20_000) => {
  const end = Date.now() + ms
  while (!check() && Date.now() < end) await new Promise(resolve => setTimeout(resolve, 50))
  expect(check()).toBe(true)
}

// watchFile's baseline is its first look at the file. A write landing before that
// causes no change until the next write, so write again until the line arrives.
const appendUntilSeen = async (line: string) => {
  fs.appendFileSync(file, `${line}\n`)
  const end = Date.now() + 20_000
  while (!lines.includes(line) && Date.now() < end) {
    await new Promise(resolve => setTimeout(resolve, 600))
    if (!lines.includes(line)) fs.appendFileSync(file, 'nudge\n')
  }
  expect(lines).toContain(line)
}

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-log-'))
  file = path.join(dir, 'Client.txt')
  fs.writeFileSync(file, 'old line that was there before\n')
  lines = []
  const server = {
    onEventAnyClient: () => {},
    // Only new-lines events carry lines; game-log-opened carries a path.
    sendEventTo: (_to: string, e: { payload: { lines?: string[] } }) => { if (e.payload.lines) lines.push(...e.payload.lines) }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watcher = new GameLogWatcher(server as any, { write: () => {} } as any)
  await watcher.restart(file)
})

afterEach(async () => {
  await watcher.stop()
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('startOffset', () => {
  it('the same file that only looked changed carries on where it was', () => {
    expect(startOffset({ ino: 7, size: 5000 }, 7, 4000)).toBe(4000)
    expect(startOffset({ ino: 7, size: 4000 }, 7, 4000)).toBe(4000)
  })

  it('a small new or cleared file is read from the top', () => {
    expect(startOffset({ ino: 8, size: 100 }, 7, 4000)).toBe(0)
    expect(startOffset({ ino: 7, size: 100 }, 7, 4000)).toBe(0)
  })

  it('a big file never replays', () => {
    expect(startOffset({ ino: 8, size: 2_000_000_000 }, 7, 4000)).toBe(2_000_000_000)
    expect(startOffset({ ino: 7, size: 2_000_000 }, 7, 3_000_000)).toBe(2_000_000)
  })
})

describe('GameLogWatcher', () => {
  it('follows new lines and skips what was already there', async () => {
    await appendUntilSeen('first')
    expect(lines).not.toContain('old line that was there before')
  })

  it('carries on after the file is cleared', async () => {
    await appendUntilSeen('first')
    fs.writeFileSync(file, 'x\n')
    await until(() => lines.includes('x'))
    fs.appendFileSync(file, 'after clear\n')
    await until(() => lines.includes('after clear'))
  })

  it('lets go of a deleted file and picks up the new one', async () => {
    await appendUntilSeen('first')
    fs.unlinkSync(file)
    // Windows refuses the name until the watcher has let go of the old file.
    const end = Date.now() + 20_000
    for (;;) {
      try {
        fs.writeFileSync(file, 'new file\n')
        break
      } catch (e) {
        if (Date.now() > end) throw e
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    await until(() => lines.includes('new file'))
    fs.appendFileSync(file, 'more\n')
    await until(() => lines.includes('more'))
  })

  it('a big file swapped in isn\'t replayed, and new lines still arrive', async () => {
    const swap = path.join(dir, 'swap.txt')
    fs.writeFileSync(swap, 'months of old lines\n'.repeat(100_000))
    fs.renameSync(file, path.join(dir, 'old.txt'))
    fs.renameSync(swap, file)
    await new Promise(resolve => setTimeout(resolve, 1000))
    fs.appendFileSync(file, 'fresh\n')
    await until(() => lines.includes('fresh'))
    expect(lines).not.toContain('months of old lines')
  })

  it('switches to a file swapped in under the same name', async () => {
    const swap = path.join(dir, 'swap.txt')
    fs.writeFileSync(swap, 'swapped in, and long enough to pass the old size easily\n')
    fs.renameSync(file, path.join(dir, 'old.txt'))
    fs.renameSync(swap, file)
    await until(() => lines.includes('swapped in, and long enough to pass the old size easily'))
  })
})
