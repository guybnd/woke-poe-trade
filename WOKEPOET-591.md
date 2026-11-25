---
id: WOKEPOET-591
title: 'Card drop-rate check in tooltip, price check, Ctrl+Space and Net worth'
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
    date: '2026-11-25T03:16:08.576Z'
    comment: Created ticket.
    id: a-2026-11-25t03-16-08-576z
  - type: comment
    user: Agent
    comment: Merged at 326c99f; dev build reloaded.
    completionComment: true
    date: '2026-11-25T03:16:13.976Z'
    id: c-2026-11-25t03-16-13-976z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T03:16:14.540Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:49.608Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/900'
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
The card drop-rate check (follow-up to WOKEPOET-584) now also applies in the item tooltip, price check, Ctrl+Space and Net worth. PR: https://github.com/guybnd/woke-poe-trade/pull/900 (326c99f).
