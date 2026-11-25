---
id: WOKEPOET-382
title: 'S2: fix and split the loot filter stack sizes e2e (fails first try 58/69 runs)'
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
    date: '2026-11-18T15:25:47.067Z'
    comment: Created ticket.
    id: a-2026-11-18t15-25-47-067z
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:47.067Z'
    comment: Created as subtask of WOKEPOET-380.
    id: a-2026-11-18t15-25-47-067z
  - type: comment
    user: Agent
    comment: >-
      PR #632 merged (9998bb80): the stack sizes flake was the game mouse left
      over a dock icon from the previous test; boot() now resets mouse and
      hovered item (keepMouse opt-out for the lab reload test).
    date: '2026-11-18T16:10:04.872Z'
    completionComment: true
    id: c-2026-11-18t16-10-04-872z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T16:10:04.872Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 9998bb80: every e2e starts with the game mouse in the middle,
      over no item.
    completionComment: true
    date: '2026-11-18T16:10:11.313Z'
    id: c-2026-11-18t16-10-11-313z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T16:10:11.605Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:53.226Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/632'
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
testing/e2e/loot-filter.spec.ts:728 "stack sizes: type a number or drag a line...". First attempt runs ~51 s against a 45 s timeout, passes on retry. Split type/Esc/drag from Gold + save, find the slow step.
