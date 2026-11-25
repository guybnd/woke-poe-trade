---
id: WOKEPOET-557
title: 'Per hour box: Maps/h, Sold, Used and Net tiles'
status: Released
priority: None
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-555
history:
  - type: activity
    user: Agent
    date: '2026-11-24T07:25:03.037Z'
    comment: Created ticket.
    id: a-2026-11-24t07-25-03-037z
  - type: activity
    user: Agent
    date: '2026-11-24T07:25:03.037Z'
    comment: Created as subtask of WOKEPOET-555.
    id: a-2026-11-24t07-25-03-037z
  - type: activity
    user: Agent
    date: '2026-11-24T07:49:59.161Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/865 is open but has merge
      conflicts with master; not merged yet.
    id: a-2026-11-24t07-49-59-161z
  - type: comment
    user: Agent
    comment: Shipped in PR 865.
    date: '2026-11-24T07:57:48.818Z'
    completionComment: true
    id: c-2026-11-24t07-57-48-818z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-24T07:57:48.818Z'
  - type: comment
    user: Agent
    comment: Merged from a cloud thread; dev build reloaded.
    completionComment: true
    date: '2026-11-24T07:58:05.165Z'
    id: c-2026-11-24t07-58-05-165z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T07:58:05.728Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:54.471Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/865'
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
The Per hour box gets four tiles:
- Maps/h: map time only. Shows "No maps" when there were none.
- Sold: sales as their own income.
- Used: orbs spent in the hideout.
- Net.
