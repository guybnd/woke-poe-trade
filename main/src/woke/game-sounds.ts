// The game's own loot filter alert sounds (PlayAlertSound 1-16 and the Sh
// sounds), for the filter editor's preview. They live in the player's own
// install, in FMOD/Desktop/ItemFilter.bank, as Vorbis inside an FMOD sound
// bank. Only FMOD can read that, so the game's own fmod.dll decodes them,
// once per game patch, into WAV files in the app's cache. Nothing of the
// game's is shipped with the app.
import { promises as fs } from 'fs'
import { execFile } from 'child_process'
import { createHash } from 'crypto'
import path from 'path'
import { app } from 'electron'
import { runningGameLog } from '../host-files/GameLogWatcher'
import { findGameLogs } from './game-log-finder'

// Filter sound id -> the sample's name in ItemFilter.bank.
export const GAME_SOUND_SAMPLES: Record<string, string> = {
  ...Object.fromEntries(Array.from({ length: 16 }, (_, i) => [String(i + 1), `AlertSound_${String(i + 1).padStart(2, '0')}`])),
  ...Object.fromEntries(['Alchemy', 'Blessed', 'Chaos', 'Divine', 'Exalted', 'Fusing', 'General', 'Mirror', 'Regal', 'Vaal']
    .map(n => [`Sh${n}`, `SH22${n}`]))
}

export function sampleFor (id: unknown): string | null {
  if (typeof id !== 'string') return null
  const key = Object.keys(GAME_SOUND_SAMPLES).find(k => k.toLowerCase() === id.trim().toLowerCase())
  return key ? GAME_SOUND_SAMPLES[key] : null
}

const BANK = path.join('FMOD', 'Desktop', 'ItemFilter.bank')
const MAX_BANK_BYTES = 64 * 1024 * 1024

// Install folders to try: the running game's first, then the folders of
// every Client.txt on this PC (newest first).
async function installDirs (): Promise<string[]> {
  const out: string[] = []
  const running = await runningGameLog()
  if (running) out.push(path.dirname(path.dirname(running)))
  for (const log of await findGameLogs({ quick: true })) out.push(path.dirname(path.dirname(log.path)))
  return [...new Set(out.map(d => path.normalize(d)))]
}

async function findBank (): Promise<{ dir: string, bank: string, size: number, mtime: number } | null> {
  for (const dir of await installDirs()) {
    try {
      const bank = path.join(dir, BANK)
      const st = await fs.stat(bank)
      await fs.access(path.join(dir, 'fmod.dll'))
      if (st.isFile() && st.size <= MAX_BANK_BYTES) return { dir, bank, size: st.size, mtime: Math.floor(st.mtimeMs) }
    } catch {}
  }
  return null
}

// Loads the install's fmod.dll and writes each named sample of an FSB5 file
// as 16-bit WAV. FMOD's header version is the dll's own version (2.3.11 is
// 0x00020311), so a game patch with a newer FMOD still loads.
export const DECODE_SCRIPT = String.raw`
param([string]$Poe, [string]$Fsb, [string]$Out, [string]$Names)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System; using System.Collections.Generic; using System.Diagnostics; using System.IO; using System.Runtime.InteropServices; using System.Text;
public static class WokeGameSounds {
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern bool SetDllDirectory(string p);
  [DllImport("fmod.dll")] static extern int FMOD_System_Create(out IntPtr s, uint v);
  [DllImport("fmod.dll")] static extern int FMOD_System_SetOutput(IntPtr s, int o);
  [DllImport("fmod.dll")] static extern int FMOD_System_Init(IntPtr s, int ch, uint f, IntPtr x);
  [DllImport("fmod.dll")] static extern int FMOD_System_Release(IntPtr s);
  [DllImport("fmod.dll")] static extern int FMOD_System_CreateSound(IntPtr s, byte[] name, uint mode, IntPtr ex, out IntPtr snd);
  [DllImport("fmod.dll")] static extern int FMOD_Sound_GetNumSubSounds(IntPtr s, out int n);
  [DllImport("fmod.dll")] static extern int FMOD_Sound_GetSubSound(IntPtr s, int i, out IntPtr sub);
  [DllImport("fmod.dll")] static extern int FMOD_Sound_GetName(IntPtr s, byte[] name, int len);
  [DllImport("fmod.dll")] static extern int FMOD_Sound_GetFormat(IntPtr s, out int type, out int fmt, out int ch, out int bits);
  [DllImport("fmod.dll")] static extern int FMOD_Sound_GetDefaults(IntPtr s, out float freq, out int prio);
  [DllImport("fmod.dll")] static extern int FMOD_Sound_GetLength(IntPtr s, out uint len, uint unit);
  [DllImport("fmod.dll")] static extern int FMOD_Sound_Lock(IntPtr s, uint off, uint len, out IntPtr p1, out IntPtr p2, out uint l1, out uint l2);
  [DllImport("fmod.dll")] static extern int FMOD_Sound_Unlock(IntPtr s, IntPtr p1, IntPtr p2, uint l1, uint l2);
  static void Ok(int r, string what) { if (r != 0) throw new Exception(what + " failed (FMOD error " + r + ")"); }
  static uint HeaderVersion(string dll) {
    // The version text ("2.3.11 (build 158528)"): the dll's numeric version
    // fields are shifted (0.2.3.11), so they can't be trusted.
    var v = FileVersionInfo.GetVersionInfo(dll);
    var m = System.Text.RegularExpressions.Regex.Match(v.ProductVersion ?? v.FileVersion ?? "", @"^\s*(\d+)\.(\d+)\.(\d+)");
    if (!m.Success) m = System.Text.RegularExpressions.Regex.Match(v.FileVersion ?? "", @"^\s*(\d+)\.(\d+)\.(\d+)");
    if (!m.Success) throw new Exception("Unknown FMOD version in the game folder");
    return Convert.ToUInt32(int.Parse(m.Groups[1].Value).ToString("D4") + int.Parse(m.Groups[2].Value).ToString("D2") + int.Parse(m.Groups[3].Value).ToString("D2"), 16);
  }
  // PCM float (format 5) or PCM16 (format 2) -> 16-bit WAV.
  static byte[] Wav(byte[] pcm, int n, int fmt, int ch, int hz) {
    int frames16 = fmt == 5 ? n / 4 : n / 2;
    var ms = new MemoryStream(); var w = new BinaryWriter(ms);
    int bytes = frames16 * 2;
    w.Write(Encoding.ASCII.GetBytes("RIFF")); w.Write(36 + bytes); w.Write(Encoding.ASCII.GetBytes("WAVEfmt "));
    w.Write(16); w.Write((short)1); w.Write((short)ch); w.Write(hz); w.Write(hz * ch * 2); w.Write((short)(ch * 2)); w.Write((short)16);
    w.Write(Encoding.ASCII.GetBytes("data")); w.Write(bytes);
    if (fmt == 5) {
      for (int i = 0; i < frames16; i++) {
        float f = BitConverter.ToSingle(pcm, i * 4);
        if (f > 1f) f = 1f; else if (f < -1f) f = -1f;
        w.Write((short)Math.Round(f * 32767f));
      }
    } else w.Write(pcm, 0, bytes);
    w.Flush(); return ms.ToArray();
  }
  public static int Run(string poe, string fsb, string outDir, string names) {
    var want = new HashSet<string>(names.Split(','), StringComparer.OrdinalIgnoreCase);
    SetDllDirectory(poe);
    IntPtr sys; Ok(FMOD_System_Create(out sys, HeaderVersion(Path.Combine(poe, "fmod.dll"))), "Loading the game's FMOD");
    int written = 0;
    try {
      // No sound output: nothing is played, only decoded.
      Ok(FMOD_System_SetOutput(sys, 2), "SetOutput");
      Ok(FMOD_System_Init(sys, 4, 0, IntPtr.Zero), "Init");
      IntPtr snd; Ok(FMOD_System_CreateSound(sys, Encoding.UTF8.GetBytes(fsb + "\0"), 0x100, IntPtr.Zero, out snd), "Opening the sound bank");
      int n; Ok(FMOD_Sound_GetNumSubSounds(snd, out n), "GetNumSubSounds");
      for (int i = 0; i < n; i++) {
        IntPtr sub; Ok(FMOD_Sound_GetSubSound(snd, i, out sub), "GetSubSound");
        var nb = new byte[256]; FMOD_Sound_GetName(sub, nb, 256);
        string name = Encoding.UTF8.GetString(nb).Split('\0')[0];
        if (!want.Contains(name)) continue;
        int type, fmt, ch, bits; Ok(FMOD_Sound_GetFormat(sub, out type, out fmt, out ch, out bits), "GetFormat");
        if (fmt != 5 && fmt != 2) continue;
        float freq; int prio; Ok(FMOD_Sound_GetDefaults(sub, out freq, out prio), "GetDefaults");
        uint len; Ok(FMOD_Sound_GetLength(sub, out len, 4), "GetLength");
        if (len == 0 || len > 64u * 1024 * 1024) continue;
        IntPtr p1, p2; uint l1, l2;
        Ok(FMOD_Sound_Lock(sub, 0, len, out p1, out p2, out l1, out l2), "Lock");
        var pcm = new byte[l1];
        Marshal.Copy(p1, pcm, 0, (int)l1);
        FMOD_Sound_Unlock(sub, p1, p2, l1, l2);
        File.WriteAllBytes(Path.Combine(outDir, name + ".wav"), Wav(pcm, (int)l1, fmt, ch, (int)freq));
        written++;
      }
    } finally { FMOD_System_Release(sys); }
    return written;
  }
}
"@
[WokeGameSounds]::Run($Poe, $Fsb, $Out, $Names)
`

function runDecode (script: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args],
      { windowsHide: true, timeout: 90_000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
        if (!err) { resolve(stdout.trim()); return }
        // PowerShell's own first line names the FMOD step that failed; the
        // command line (every path in it) never reaches the UI.
        const why = err.killed ? 'decoding timed out' : (stderr.trim().split(/\r?\n/)[0] || 'couldn\'t decode the game\'s sounds')
        reject(new Error(why.replace(/^Exception calling "Run" with "\d+" argument\(s\): /, '').replace(/^"|"$/g, '')))
      })
  })
}

// The FSB5 sound data inside the bank (an FMOD bank is a RIFF file with the
// FSB5 near the end). The 'FSB5' magic plus version 1 marks its start.
export function fsbSlice (bank: Buffer): Buffer | null {
  let at = bank.indexOf('FSB5')
  while (at >= 0) {
    if (at + 8 <= bank.length && bank.readUInt32LE(at + 4) === 1) return bank.subarray(at)
    at = bank.indexOf('FSB5', at + 4)
  }
  return null
}

function cacheRoot (): string {
  return path.join(app.getPath('userData'), 'game-sounds')
}

const DONE = 'done.json'
let pending: Promise<string> | null = null

// The folder holding the decoded WAVs for the bank as it is now. Decodes
// on first use and again after a game patch changes the bank.
async function soundsDir (): Promise<string> {
  if (process.platform !== 'win32') throw new Error('Only on Windows')
  const found = await findBank()
  if (!found) throw new Error('Path of Exile install not found')
  // One folder per install and bank version: Steam and standalone side by
  // side keep their own, and a patch gets a fresh one.
  const install = createHash('sha1').update(found.dir.toLowerCase()).digest('hex').slice(0, 8)
  const dir = path.join(cacheRoot(), `${install}-${found.size}-${found.mtime}`)
  try {
    await fs.access(path.join(dir, DONE))
    return dir
  } catch {}
  await fs.mkdir(dir, { recursive: true })
  const fsb = fsbSlice(await fs.readFile(found.bank))
  if (!fsb) throw new Error('No sounds in the game\'s ItemFilter.bank')
  const fsbPath = path.join(dir, 'ItemFilter.fsb')
  const script = path.join(dir, 'decode.ps1')
  await fs.writeFile(fsbPath, fsb)
  await fs.writeFile(script, DECODE_SCRIPT, 'utf8')
  try {
    const out = await runDecode(script, ['-Poe', found.dir, '-Fsb', fsbPath, '-Out', dir, '-Names', Object.values(GAME_SOUND_SAMPLES).join(',')])
    const written = Number(out.split(/\s+/).pop())
    const wanted = Object.keys(GAME_SOUND_SAMPLES).length
    // A sound the bank lacks would fail until the next patch: cache only a
    // full set, so the next click tries again.
    if (written !== wanted) throw new Error(`only ${Number.isFinite(written) ? written : 0} of ${wanted} sounds decoded`)
  } finally {
    await fs.rm(fsbPath, { force: true })
    await fs.rm(script, { force: true })
  }
  await fs.writeFile(path.join(dir, DONE), JSON.stringify({ from: found.bank, at: Date.now() }))
  // This install's older patches aren't needed any more.
  for (const old of await fs.readdir(cacheRoot())) {
    if (old !== path.basename(dir) && old.startsWith(`${install}-`)) await fs.rm(path.join(cacheRoot(), old), { recursive: true, force: true }).catch(() => {})
  }
  return dir
}

function sharedSoundsDir (): Promise<string> {
  pending ??= soundsDir().finally(() => { pending = null })
  return pending
}

export async function readGameSound (args: { id: string }): Promise<{ data: string, mime: string }> {
  const sample = sampleFor(args?.id)
  if (!sample) throw new Error('Not a game sound')
  const dir = await sharedSoundsDir()
  try {
    return { data: (await fs.readFile(path.join(dir, `${sample}.wav`))).toString('base64'), mime: 'audio/wav' }
  } catch {
    throw new Error(`The game has no sound ${args.id}`)
  }
}
