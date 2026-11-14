// Client.txt lines between two times (main/src/woke/game-log-range.ts), used
// to rebuild old runs' timelines. The log is too big to read whole, so the
// start is found by halving the file.
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { logLineTime, readLogRange } from '../../main/src/woke/game-log-range'

const pad = (n: number) => String(n).padStart(2, '0')
function stamp (d: Date) {
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// A log a few MB long: a line a second with chat noise, and a zone line every minute.
function writeLog (start: Date, seconds: number): string {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'woke-log-')), 'Client.txt')
  const out: string[] = []
  for (let s = 0; s < seconds; s++) {
    const t = stamp(new Date(start.getTime() + s * 1000))
    if (s % 60 === 0) {
      out.push(`${t} 1 abc [DEBUG Client 1] Generating level 5 area "1_1_${s / 60}" with seed 1`)
      out.push(`${t} 1 abc [INFO Client 1] : You have entered Zone ${s / 60}.`)
    } else {
      out.push(`${t} 1 abc [INFO Client 1] #Someone: lots of chat to make the file big ${'x'.repeat(40)}`)
    }
  }
  fs.writeFileSync(file, out.join('\r\n') + '\r\n')
  return file
}

describe('reading a time range of Client.txt', () => {
  const start = new Date(2026, 10, 4, 18, 0, 0)
  const file = writeLog(start, 12 * 3600)

  it('returns only the wanted lines inside the range', async () => {
    const from = start.getTime() + 3 * 3600_000
    const to = from + 10 * 60_000
    const { lines } = await readLogRange(file, from, to)
    expect(lines).toHaveLength(22)
    expect(lines[0]).toContain('area "1_1_180"')
    expect(lines[1]).toContain('You have entered Zone 180.')
    expect(lines[lines.length - 1]).toContain('Zone 190.')
    expect(lines.every(l => !l.endsWith('\r'))).toBe(true)
  })

  it('handles the very start and a range past the end', async () => {
    expect((await readLogRange(file, start.getTime() - 60_000, start.getTime())).lines).toHaveLength(2)
    expect((await readLogRange(file, start.getTime() + 13 * 3600_000, start.getTime() + 14 * 3600_000)).lines).toEqual([])
  })

  it('refuses bad ranges and a missing file', async () => {
    expect((await readLogRange(file, 10, 5)).lines).toEqual([])
    expect((await readLogRange(null, 0, 1)).lines).toEqual([])
    expect((await readLogRange(path.join(os.tmpdir(), 'no-such-dir-x', 'Client.txt'), 0, 1)).path).toBeNull()
  })

  it('reads the game timestamp as local time', () => {
    expect(logLineTime('2026/11/04 18:00:01 1 abc [INFO Client 1] x')).toBe(new Date(2026, 10, 4, 18, 0, 1).getTime())
    expect(logLineTime('nope')).toBeNull()
  })
})
