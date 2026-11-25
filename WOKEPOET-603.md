---
id: WOKEPOET-603
title: 'Tooltip audit part 1: fill empty tooltips, 18 missing uniques'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-25T05:02:59.001Z'
    comment: Created ticket.
    id: a-2026-11-25t05-02-59-001z
  - type: comment
    user: Agent
    comment: Merged at 7a912c5; dev build reloaded.
    completionComment: true
    date: '2026-11-25T05:03:02.086Z'
    id: c-2026-11-25t05-03-02-086z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T05:03:02.590Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:47.777Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/915'
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
Item tooltip: fill the empty ones (base implicits, flasks, tinctures, fragments) and add 18 missing uniques. PR: https://github.com/guybnd/woke-poe-trade/pull/915 (7a912c5).
