// The app icon the player picked in Settings > Look. The images live in
// public/images/app-icons as <id>.png, plus <id>.ico for the Windows tray; main
// finds them by id (main/src/woke/app-icon.ts).
export const DEFAULT_APP_ICON = 'eternal-orb'

export const APP_ICONS: Array<{ id: string, label: string }> = [
  { id: 'eternal-orb', label: 'Eternal Orb' },
  { id: 'orb-of-conflict', label: 'Orb of Conflict' },
  { id: 'divine-orb', label: 'Divine Orb' },
  { id: 'maven-witness', label: 'Maven Witness' },
  { id: 'runic-astrolabe', label: 'Runic Astrolabe' },
  { id: 'fracturing-orb', label: 'Fracturing Orb' },
  { id: 'shapers-exalted', label: "Shaper's Exalted Orb" },
  { id: 'offering-to-the-goddess', label: 'Offering to the Goddess' },
  { id: 'goldrim', label: 'Goldrim' },
  { id: 'forged-w', label: 'Forged W' },
  { id: 'waking-eye', label: 'Waking Eye' },
  { id: 'daybreak', label: 'Daybreak' },
  { id: 'lantern', label: 'Lantern' },
  { id: 'risen', label: 'Risen' }
]

export function appIconId (id: string | undefined): string {
  return APP_ICONS.some(i => i.id === id) ? id! : DEFAULT_APP_ICON
}

export function appIconUrl (id: string | undefined): string {
  return `/images/app-icons/${appIconId(id)}.png`
}
