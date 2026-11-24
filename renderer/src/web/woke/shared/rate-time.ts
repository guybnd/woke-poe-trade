// What time every "per hour" counts (Settings → Game & league → Per hour):
// Net worth's rates, strategy runs, Session story's night card, Session
// analytics and their Ctrl+Space answers. One rule for all of them.
//   play: maps and other areas (campaign, boss arenas) only.
//   hub:  hideout and town too.
//   all:  every minute, AFK and the game closed included (the clock).
// Pure: rate-time-now.ts reads the setting.

export type RateTime = 'play' | 'hub' | 'all'
export interface RateTimeHolder { woke?: { rateTime?: RateTime }, widgets?: Array<{ wmType: string, rateWithHub?: boolean }> }

// Unset: Net worth's old "Leave out hideout" box, unticked, carries over as
// "Play + hideout"; otherwise play only.
export function rateTimeOf (config: RateTimeHolder): RateTime {
  const t = config.woke?.rateTime
  if (t === 'play' || t === 'hub' || t === 'all') return t
  return config.widgets?.find(w => w.wmType === 'woke-net-worth')?.rateWithHub === true ? 'hub' : 'play'
}

export const countsHub = (t: RateTime) => t !== 'play'
export const countsOff = (t: RateTime) => t === 'all'

export type TimeSplit = Record<'map' | 'play' | 'hub' | 'off', number>
// The time a split counts under `t`.
export function countedMs (s: TimeSplit, t: RateTime): number {
  return s.map + s.play + (countsHub(t) ? s.hub : 0) + (countsOff(t) ? s.off : 0)
}

// "hideout, town and AFK left out" and the like, for hover text.
export function leftOutText (t: RateTime): string {
  return t === 'play' ? 'hideout, town, AFK and game closed left out' : t === 'hub' ? 'AFK and game closed left out' : 'all time counted'
}
export const RATE_TIME_WHERE = 'Play, + Hideout or All changes what counts, in every tool at once'
