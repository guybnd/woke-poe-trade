---
id: WOKEPOET-387
title: 'G1: net worth fake-game e2e from stash read to window'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - testing
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-380
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:58.104Z'
    comment: Created ticket.
    id: a-2026-11-18t15-25-58-104z
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:58.104Z'
    comment: Created as subtask of WOKEPOET-380.
    id: a-2026-11-18t15-25-58-104z
  - type: comment
    user: Agent
    comment: >-
      PR #642 merged (a8446a60): fake pathofexile.com in the test host;
      net-worth.spec.ts covers turn on, sign in, tab pick, read, priced rows,
      turn off.
    date: '2026-11-18T16:14:31.053Z'
    completionComment: true
    id: c-2026-11-18t16-14-31-053z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T16:14:31.053Z'
  - type: comment
    user: Agent
    comment: 'Merged as a8446a60: Net worth e2e.'
    completionComment: true
    date: '2026-11-18T16:14:36.389Z'
    id: c-2026-11-18t16-14-36-389z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T16:14:36.682Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:53.019Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/642'
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
Net worth had 6 bugs (WOKEPOET-220, 230-235), 3,100 lines, 4 unit files, no e2e. One flow: two stash reads, a tab change not counted as profit, relic/foil uniques priced as themselves, profit per hour line.
