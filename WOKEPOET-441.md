---
id: WOKEPOET-441
title: 'Price check: sort listings by real value across chaos and divine'
status: Released
priority: Medium
effort: S
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T06:07:06.603Z'
    comment: Created ticket.
    id: a-2026-11-21t06-07-06-603z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T06:07:09.945Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t06-07-09-945z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T06:07:09.945Z'
  - type: comment
    user: Agent
    comment: >-
      Merged in PR 704: listings sort by poe.ninja chaos value; new-item panel
      async to stay in startup JS budget. CI green, review clean.
    date: '2026-11-21T06:22:33.927Z'
    completionComment: true
    id: c-2026-11-21t06-22-33-927z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T06:22:33.927Z'
  - type: comment
    user: Agent
    comment: >-
      Price check rows (and the new-item panel's 6 listings) now sort by chaos
      value at the poe.ninja rate; unvalued currencies go last, no divine rate
      keeps trade order. No extra searches. Startup JS was at budget, so the
      new-item panel became an async component to make room (budget unchanged).
      CI green, adversarial review clean.
    completionComment: true
    date: '2026-11-21T06:22:43.232Z'
    id: c-2026-11-21t06-22-43-232z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T06:22:43.692Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:42.089Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/704'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/pob-builds/BuildDetail.vue
    additions: 4
    deletions: 4
  - file: renderer/src/web/woke/pob-builds/build-model.ts
    additions: 14
    deletions: 0
  - file: renderer/test/woke/pob-builds.test.ts
    additions: 39
    deletions: 1
version: '00002'
releasedAt: '2026-11-25T11:52:41.308Z'
releaseDocPath: release-notes/00002
---
Trade results showed in the trade site's order (its own currency ratios), so a 150c listing could land after 1 div. Fix: re-sort the fetched rows by chaos value at the poe.ninja rate (divine and other currencies); unvalued rows go last; no divine rate means the order stays. No extra trade searches. Branch woke/price-sort-currency.
