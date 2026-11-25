---
id: WOKEPOET-584
title: 'Stacked decks: drop-rate check for fake card prices'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - bug
  - prices
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-25T02:37:16.006Z'
    comment: Created ticket.
    id: a-2026-11-25t02-37-16-006z
  - type: comment
    user: Agent
    comment: Merged at 5198e31; dev build reloaded.
    completionComment: true
    date: '2026-11-25T02:37:20.150Z'
    id: c-2026-11-25t02-37-20-150z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T02:37:20.586Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:49.978Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/899'
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
version: 1.30.20
releasedAt: '2026-11-25T04:05:49.382Z'
releaseDocPath: release-notes/1.30.20
---
Stacked decks hold a card price that's higher than its drop rate allows (e.g. Loyalty at 53 div). PR: https://github.com/guybnd/woke-poe-trade/pull/899 (5198e31).
