---
id: WOKEPOET-299
title: 'Alt copy hotkeys: let go of Alt for Ctrl+C (3.30 ignores Ctrl+Alt+C)'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - bug
  - '3.30'
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:20:26.636Z'
    comment: Created ticket.
    id: a-2026-11-15t05-20-26-636z
  - type: comment
    user: Agent
    comment: 'Merged #489 on 2026-11-15.'
    completionComment: true
    date: '2026-11-15T05:20:45.042Z'
    id: c-2026-11-15t05-20-45-042z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:20:45.419Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:10:23.199Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/489'
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
version: '00024'
releasedAt: '2026-11-27T16:10:17.975Z'
releaseDocPath: release-notes/00024
---
3.30 ignores Ctrl+Alt+C, so Alt+F / Alt+D copies timed out. The hotkey now lifts Alt for the copy and presses it again. Shipped in PR #489.
