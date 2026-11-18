---
id: WOKEPOET-379
title: 'Price check mod row right-click menu: grouped, Fractured only on any mod'
status: Grooming
priority: Medium
effort: M
assignee: Agent
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T14:31:09.457Z'
    comment: Created ticket.
    id: a-2026-11-18t14-31-09-457z
  - type: activity
    user: Agent
    date: '2026-11-18T14:31:13.922Z'
    comment: Updated implementation link.
    id: a-2026-11-18t14-31-13-922z
  - type: activity
    user: Agent
    date: '2026-11-18T14:31:15.511Z'
    comment: >-
      Built and reviewed on woke/mod-row-menu (e66d9b99). Adversarial review: 5
      findings fixed. Local checks: vue-tsc, eslint, vitest 4,586 pass, vite
      build OK. Handed to coordinator for merge. Untried in the live overlay.
      Guy's mock picks not saved yet (asked in thread).
    id: a-2026-11-18t14-31-15-511z
implementationLink: woke/mod-row-menu @ e66d9b99
---
Guy asked (2026-11-18) for a better right-click menu on price check mod rows, e.g. Fractured only on any mod, and ideas.

Mocks + idea list with picks: https://claude.ai/artifact/A23iFZEDZdvc8MKFY6hVPt (B recommended and built; Guy's saved picks still pending).

Branch `woke/mod-row-menu` (worktree E:\Git\woke\wt\mod-menu):
- Menu grouped under Search / Min / Price as / Copy headings, ✓ on on/off lines
- Fractured only on any explicit mod; on one-mod totals via split
- 10% under/over my roll; Copy stash search; Ctrl+Click tick box = Search only this
- Harvest swaps skip fractured-only rows
- Menu closes when its panel is dismissed or the overlay hides (Guy's stuck-menu report)

Unbuilt candidates awaiting picks: next tier up min, always/never tick per mod, Alt+Click exclude, crafted only, show all tiers.
