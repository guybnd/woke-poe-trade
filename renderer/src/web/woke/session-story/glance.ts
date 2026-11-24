import type { ChipPlace, SessionStoryWidget } from './widget'

// Its own file, apart from widget.ts (which Config.ts loads at startup), so
// these stay out of the startup JS (perf budget).

export function glanceOn (config: Pick<SessionStoryWidget, 'glance'>): boolean {
  return config.glance !== false
}

// Where the map line goes. Not picked: on the glance bar while it's on, so one
// thing shows while you play; the dock icon with it off. The bar picked and
// then turned off: the dock icon.
export function chipPlaceOf (config: Pick<SessionStoryWidget, 'glance' | 'chipPlace'>): ChipPlace {
  const place = config.chipPlace ?? (glanceOn(config) ? 'bar' : 'dock')
  return place === 'bar' && !glanceOn(config) ? 'dock' : place
}
