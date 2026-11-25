---
id: WOKEPOET-479
title: 'Price check: poe.ninja price first for bulk items, live search on click'
status: Released
priority: Medium
effort: M
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-22T11:06:33.597Z'
    comment: Created ticket.
    id: a-2026-11-22t11-06-33-597z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-22T11:06:37.340Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-22t11-06-37-340z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-22T11:06:37.340Z'
  - type: comment
    user: Agent
    comment: >-
      Mockups with pick buttons (A recommended, being built):
      https://claude.ai/artifact/RzCo6AUkASKWzLAABZuVtp
    date: '2026-11-22T11:09:38.136Z'
    selfAttested: true
    id: c-2026-11-22t11-09-38-136z
  - type: activity
    user: Agent
    date: '2026-11-22T11:17:37.041Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/761 open (option A).
      Adversarial review + CI checks running.
    id: a-2026-11-22t11-17-37-041z
  - type: comment
    user: Agent
    comment: >-
      PR 761 merged (option A), CI green, review fixes in. Guy's mockup pick
      pending.
    date: '2026-11-22T11:29:57.061Z'
    completionComment: true
    id: c-2026-11-22t11-29-57-061z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T11:29:57.061Z'
  - type: comment
    user: Agent
    comment: >-
      Merged option A: exchange items poe.ninja prices exactly show the cached
      price as the verdict and search only on "Check live offers"/Enter.
      Overlay-started checks still search live; no hover search; Classic shows
      the card; checks before poe.ninja loads wait for it. Setting "poe.ninja
      price first" (Ctrl+Space findable). Guy's mockup pick pending.
    completionComment: true
    date: '2026-11-22T11:30:02.460Z'
    id: c-2026-11-22t11-30-02-460z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T11:30:02.985Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:53.795Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/761'
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
version: '0001'
releasedAt: '2026-11-25T11:50:45.359Z'
releaseDocPath: release-notes/0001
---
> **TL;DR:** Price checking currency and other bulk goods shows the cached poe.ninja price straight away as the verdict and no longer spends an exchange search; "Check live offers" (or Enter) runs it.

Guy's idea (project thread). Today bulk-preset items auto-search the exchange (smartInitialSearch) and show the ninja chip after an 800 ms artificial delay.

Plan (recommended option A, mockups in the thread):
- Bulk preset + exact poe.ninja price → no auto search; ninja verdict card in the verdict slot with each / stack value / 7d change and a "Check live offers" button.
- No ninja price → auto search as before.
- Lazy component to stay in the startup JS budget.
