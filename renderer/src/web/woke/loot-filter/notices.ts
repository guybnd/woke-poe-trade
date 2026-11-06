// What the loot filter's dock icon has to tell you, and which of it you've said
// you don't need to hear. "Got it" holds until the notice's value changes;
// "Don't tell me" turns the notice off. Warnings about the filter not working
// can't be turned off, and "Got it" on them only lasts until a restart.
export interface Notice {
  id: string
  text: string
  // What it says now: a changed value is news again.
  value: string | number
  warn?: boolean
  // The editor tab that deals with it.
  tab?: 'prices' | 'neversink' | 'changes'
  // Goes away by itself, so there's nothing to dismiss.
  passing?: boolean
}

// The button that goes to it. Every label says where you're going.
export function noticeAction (n: Notice): string {
  switch (n.id) {
    case 'update': return 'Review update'
    case 'prices': return `Review ${n.value} move${n.value === 1 ? '' : 's'}`
    case 'moves-league': return 'Review moves'
    case 'safety':
    case 'net-prices': return 'See safety net'
    case 'prices-old': return 'See prices'
    case 'load': return 'See changes'
    case 'failed': return 'Fix changes'
    default: return 'Open editor'
  }
}

export interface NoticeState {
  off: string[]
  seen: Record<string, string | number>
}

export function visibleNotices (list: Notice[], state: NoticeState): Notice[] {
  return list.filter(n => {
    if (n.passing) return true
    if (!n.warn && state.off.includes(n.id)) return false
    return state.seen[n.id] !== n.value
  })
}

// What "Don't tell me about this" can silence, and the Prices tab can bring back.
// An update stays: Got it holds it until the next version.
export const TURN_OFF_IDS = ['safety', 'prices']

export function canTurnOff (n: Notice): boolean {
  return TURN_OFF_IDS.includes(n.id)
}

// Returns the new state after "Got it" on the listed notices. Warnings go into
// `session`, which isn't saved.
export function markSeen (list: Notice[], saved: Record<string, string | number>, session: Record<string, string | number>) {
  const nextSaved = { ...saved }
  const nextSession = { ...session }
  for (const n of list) {
    if (n.passing) continue
    if (n.warn) nextSession[n.id] = n.value
    else nextSaved[n.id] = n.value
  }
  return { saved: nextSaved, session: nextSession }
}
