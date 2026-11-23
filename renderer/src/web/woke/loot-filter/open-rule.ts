// Opens the loot filter editor on one rule from another window, e.g. the
// price check's filter chip ("Go to rule"). The loot filter widget registers
// the opener while it is mounted.

export interface RuleRef { type: string, tier: string }

type Opener = (at: RuleRef) => void

// Newest last: with more than one loot filter widget, the latest mounted
// one opens, and unmounting it hands back to the one before.
const openers: Opener[] = []

export function setRuleOpener (fn: Opener): () => void {
  openers.push(fn)
  return () => {
    const i = openers.lastIndexOf(fn)
    if (i >= 0) openers.splice(i, 1)
  }
}

// False when no loot filter widget is mounted to show it.
export function openRuleInEditor (at: RuleRef): boolean {
  const open = openers[openers.length - 1]
  if (!open) return false
  open(at)
  return true
}
