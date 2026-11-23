// First-run help in the overlay: a welcome card on the first open after setup,
// then the rail's buttons named beside them for a few more opens. Only set up
// by the setup window's first finish, so players who updated never see it.
import type { WelcomeState, WokeModulesConfig } from '../modules'
import { markAllNewsSeen } from './news'

export const LABEL_OPENS = 3
export const HELP_URL = 'https://guybnd.github.io/woke-poe-trade/quick-start'

// The setup window's Finish: once per config.
export function startWelcome (woke: WokeModulesConfig): void {
  if (woke.welcome) return
  woke.welcome = { due: true, labelOpens: LABEL_OPENS }
  // Everything is new to them: no "New" seals on a fresh install.
  markAllNewsSeen(woke)
}

export type WelcomePhase = 'card' | 'labels' | null

export function welcomePhase (w: WelcomeState | undefined): WelcomePhase {
  if (!w) return null
  if (w.due) return 'card'
  return w.labelOpens > 0 ? 'labels' : null
}

// "Got it", or the player opened a tool: the card is done for good.
export function dismissWelcome (w: WelcomeState | undefined): void {
  if (w) w.due = false
}

// The overlay closed after showing the labels: one open fewer.
export function labelsShown (w: WelcomeState | undefined): void {
  if (w && !w.due && w.labelOpens > 0) w.labelOpens -= 1
}
