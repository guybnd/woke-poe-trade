// The top step (Beam) of every score-filter class: red text on white, the
// classic chase look, with the border, beam and minimap icon in the class's
// own colour so you can tell a mirror from a Headhunter at a glance
// (Guy's pick T2, 2026-11-27). Currency is the classic all-red one.
import type { FilterAction } from './parse'

export type TopClass = 'currency' | 'uniques' | 'cards' | 'gems' | 'fragments' | 'maps' | 'jewels'

interface Accent {
  // Border colour (RGB); the game's beam and icon colour names.
  border: [number, number, number]
  beam: string
  icon: string
  shape: string
}

export const TOP_ACCENTS: Record<TopClass, Accent> = {
  currency: { border: [255, 0, 0], beam: 'Red', icon: 'Red', shape: 'Circle' },
  uniques: { border: [175, 96, 37], beam: 'Orange', icon: 'Orange', shape: 'Star' },
  cards: { border: [0, 90, 220], beam: 'Blue', icon: 'Blue', shape: 'Square' },
  gems: { border: [0, 140, 130], beam: 'Cyan', icon: 'Cyan', shape: 'Triangle' },
  fragments: { border: [140, 40, 200], beam: 'Purple', icon: 'Purple', shape: 'Kite' },
  maps: { border: [150, 110, 0], beam: 'Yellow', icon: 'Yellow', shape: 'Diamond' },
  jewels: { border: [0, 140, 40], beam: 'Green', icon: 'Green', shape: 'Hexagon' }
}

const a = (key: string, ...args: Array<string | number>): FilterAction => ({ key, args: args.map(String) })

export function topStepActions (cls: TopClass): FilterAction[] {
  const t = TOP_ACCENTS[cls]
  return [
    a('SetFontSize', 45),
    a('SetTextColor', 255, 0, 0, 255),
    a('SetBorderColor', ...t.border, 255),
    a('SetBackgroundColor', 255, 255, 255, 255),
    a('PlayAlertSound', 6, 300),
    a('PlayEffect', t.beam),
    a('MinimapIcon', 0, t.icon, t.shape)
  ]
}
