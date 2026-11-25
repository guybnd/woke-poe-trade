---
id: WOKEPOET-595
title: 'Ctrl+Space: save or remove a Recent line'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-25T04:13:57.994Z'
    comment: Created ticket.
    id: a-2026-11-25t04-13-57-994z
  - type: comment
    user: Agent
    comment: Merged at 208b1f1; dev build reloaded.
    completionComment: true
    date: '2026-11-25T04:14:02.237Z'
    id: c-2026-11-25t04-14-02-237z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T04:14:02.887Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:48.215Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/909'
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
In Ctrl+Space search, a Recent line can be saved or removed. PR: https://github.com/guybnd/woke-poe-trade/pull/909 (208b1f1).
