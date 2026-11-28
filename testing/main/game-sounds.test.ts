// The game's own alert sounds (main/src/woke/game-sounds.ts): which sample
// each filter sound plays, finding the sounds inside the bank, and (on a PC
// with the game installed) decoding them with the game's own FMOD.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { DECODE_SCRIPT, GAME_SOUND_SAMPLES, fsbSlice, sampleFor } from '../../main/src/woke/game-sounds'

describe('sampleFor', () => {
  it('maps 1-16 and the Sh sounds, any case', () => {
    expect(sampleFor('1')).toBe('AlertSound_01')
    expect(sampleFor('16')).toBe('AlertSound_16')
    expect(sampleFor('ShAlchemy')).toBe('SH22Alchemy')
    expect(sampleFor('shmirror')).toBe('SH22Mirror')
    expect(Object.keys(GAME_SOUND_SAMPLES)).toHaveLength(26)
  })

  it.each([['0'], ['17'], ['01'], ['ping.mp3'], ['../x'], [''], [7], [null]])('refuses %s', (id) => {
    expect(sampleFor(id)).toBeNull()
  })
})

describe('fsbSlice', () => {
  it('starts at the FSB5 header, not an earlier mention of the name', () => {
    const head = Buffer.from('RIFF....FSB5xxxx')
    const fsb = Buffer.concat([Buffer.from('FSB5'), Buffer.from([1, 0, 0, 0]), Buffer.from('data')])
    const got = fsbSlice(Buffer.concat([head, fsb]))
    expect(got?.equals(fsb)).toBe(true)
  })

  it('is null without one', () => {
    expect(fsbSlice(Buffer.from('RIFF nothing here'))).toBeNull()
  })
})

// Only where the game is installed (Guy's PC); CI has no game.
const POE = process.env.WOKE_POE_DIR ?? 'F:\\SteamLibrary\\steamapps\\common\\Path of Exile'
const BANK = path.join(POE, 'FMOD', 'Desktop', 'ItemFilter.bank')

describe.skipIf(process.platform !== 'win32' || !fs.existsSync(BANK))('decoding with the installed game', () => {
  it('writes 16-bit WAVs of the asked samples', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-game-sounds-'))
    try {
      const fsb = path.join(dir, 'ItemFilter.fsb')
      fs.writeFileSync(fsb, fsbSlice(fs.readFileSync(BANK))!)
      fs.writeFileSync(path.join(dir, 'decode.ps1'), DECODE_SCRIPT)
      const out = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(dir, 'decode.ps1'),
        '-Poe', POE, '-Fsb', fsb, '-Out', dir, '-Names', 'AlertSound_01,SH22Alchemy'], { windowsHide: true, timeout: 60_000 }).toString().trim()
      expect(out).toBe('2')
      const wav = fs.readFileSync(path.join(dir, 'AlertSound_01.wav'))
      expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
      expect(wav.readUInt16LE(20)).toBe(1) // PCM
      expect(wav.readUInt16LE(34)).toBe(16) // bits
      expect(wav.length).toBeGreaterThan(100_000)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
