// The app icon the player picked in Settings > Look. The list of choices lives
// in the renderer (web/woke/ui/app-icon.ts); here an id only has to name a file.
import fs from 'fs'
import path from 'path'

const DEFAULT_APP_ICON = 'eternal-orb'

let current = DEFAULT_APP_ICON

function iconDir (): string {
  return process.env.VITE_DEV_SERVER_URL
    ? path.join(__dirname, '../../renderer/public/images/app-icons')
    : path.join(__dirname, 'images/app-icons')
}

// The id comes from the config file, so it can't be trusted to be a file name.
export function resolveAppIcon (id: unknown, dir = iconDir()): string {
  if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) return DEFAULT_APP_ICON
  const known = fs.existsSync(path.join(dir, `${id}.png`)) && fs.existsSync(path.join(dir, `${id}.ico`))
  return known ? id : DEFAULT_APP_ICON
}

export function appIconFile (ext: 'png' | 'ico'): string {
  return path.join(iconDir(), `${current}.${ext}`)
}

// True when the icon changed, so the tray and windows need redrawing.
export function setAppIcon (id: unknown): boolean {
  const next = resolveAppIcon(id)
  if (next === current) return false
  current = next
  return true
}
