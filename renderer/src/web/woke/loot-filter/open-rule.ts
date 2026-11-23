// Opens the loot filter editor on one rule from another window, e.g. the
// price check's filter chip ("Go to rule"). The loot filter widget registers
// the opener while it is mounted.

export interface RuleRef { type: string, tier: string }

type Opener = (at: RuleRef) => void

let opener: Opener | null = null

export function setRuleOpener (fn: Opener): () => void {
  opener = fn
  return () => { if (opener === fn) opener = null }
}

// False when no loot filter widget is mounted to show it.
export function openRuleInEditor (at: RuleRef): boolean {
  if (!opener) return false
  opener(at)
  return true
}
