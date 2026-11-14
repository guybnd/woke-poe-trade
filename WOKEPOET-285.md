---
id: WOKEPOET-285
title: 'Campaign: auto-pass kill steps from boss lines; short boss names'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T05:31:17.534Z'
    comment: Created ticket.
    id: a-2026-11-14t05-31-17-534z
  - type: activity
    user: Agent
    date: '2026-11-14T05:37:43.298Z'
    comment: Updated implementation link.
    id: a-2026-11-14t05-37-43-298z
  - type: comment
    user: Agent
    comment: >-
      PR #444 is ready. Local checks pass, and the adversarial review found
      nothing serious. A repeat-line test was added after the review. Merges
      through the cloud merge thread.
    date: '2026-11-14T05:37:44.429Z'
    completionComment: true
    id: c-2026-11-14t05-37-44-429z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-14T05:37:44.429Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as ac39eae6. Boss defeat lines (25, taken from Guy's Client.txt)
      now tick off their kill steps, and kill steps show short boss names.
    completionComment: true
    date: '2026-11-14T05:48:04.939Z'
    id: c-2026-11-14t05-48-04-939z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-14T05:48:05.780Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/444'
needsAction: null
baselineCommit: ae072f60270fa58e9d206c73fab27bd78609319b
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/loot-filter/compose.ts
    additions: 1
    deletions: 1
  - file: renderer/src/web/woke/loot-filter/store.ts
    additions: 3
    deletions: 14
  - file: renderer/test/woke/filter-flows.test.ts
    additions: 11
    deletions: 0
  - file: renderer/test/woke/filter-price-flows.test.ts
    additions: 6
    deletions: 5
---
> **TL;DR:** The campaign tracker ticks off a boss kill step when Client.txt logs that boss's defeat line (Sin naming the god, e.g. "Sin: Abberath!"). Kill steps show only the boss's first name.

- Data: renderer/src/web/woke/campaign/boss-lines.ts, 25 lines from Guy's real Client.txt, each pinned to zone + speaker + exact text, kept only when said once per kill, after the fight, with no death after it.
- advanceOnKill never skips another boss's kill step in the same zone (Harvest order).
- Left out on purpose: lines said at fight start or mid-fight (Merveil, Brutus, Kaom, Piety "Kill me!", Shavronne), and bosses that log no line.
- Branch woke/boss-line-tick in E:\Git\woke-campaign-trail.
