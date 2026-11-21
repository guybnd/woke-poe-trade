---
id: WOKEPOET-450
title: Read sold-items trade history from pathofexile.com
status: Grooming
priority: None
effort: None
assignee: unassigned
tags:
  - personal
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T10:20:44.317Z'
    comment: Created ticket.
    id: a-2026-11-21t10-20-44-317z
  - type: activity
    user: Agent
    date: '2026-11-21T10:21:02.377Z'
    comment: >-
      Options A/B/C sent to Guy on a card in project thread
      cmsg_01TFAVQEVFL8KKQ8fhVfpfJo98Es9he4ogKwZ5Em98fm1G; waiting on his pick.
    id: a-2026-11-21t10-21-02-377z
---
Guy asked whether the app can read pathofexile.com/trade/history (his sold items).

Findings (2026-11-21):
- The history page uses an undocumented internal endpoint (GET .../history), authenticated only by the POESESSID login cookie. No OAuth scope or documented endpoint covers trade history (dev docs: account:profile/leagues/stashes/characters/league_accounts/item_filter only). GGG is also not accepting new OAuth apps.
- GGG dev portal: reverse-engineering endpoints outside the docs is against ToS 7i. The existing hidden opt-in stash reader (character-window/get-stash-items via POESESSID in Electron's cookie store, main/src/woke/personal) is in the same category already.
- Feasible by reusing the stash reader's sign-in window, sessionFetch and RateLimiter. Exact PoE1 path/response to be confirmed with one call in Guy's signed-in session before building.

Waiting on Guy's pick (decision card in project thread).
