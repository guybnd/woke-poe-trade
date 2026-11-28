// How loud the game plays filter sounds, for the loot filter's sound
// preview: its master volume times its item filter alert volume (Options ›
// Sound, 0-100 each), from production_Config.ini. 1 when the file or the
// values aren't there.
import { promises as fs } from 'fs'
import ini from 'ini'

export function soundGainFrom (parsed: Record<string, Record<string, unknown> | undefined>): number {
  const sound = parsed.SOUND ?? {}
  const part = (...keys: string[]) => {
    for (const k of keys) {
      const n = Number(sound[k])
      if (sound[k] != null && sound[k] !== '' && Number.isFinite(n)) return Math.max(0, Math.min(1, n / 100))
    }
    return 1
  }
  return part('master_volume2', 'master_volume') * part('item_filter_sound_volume2', 'item_filter_sound_volume')
}

export async function gameSoundGain (configPath: string | null): Promise<{ gain: number }> {
  if (!configPath) return { gain: 1 }
  try {
    return { gain: soundGainFrom(ini.parse((await fs.readFile(configPath, 'utf8')).trimStart())) }
  } catch {
    return { gain: 1 }
  }
}
