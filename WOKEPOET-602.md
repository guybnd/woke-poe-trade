---
id: WOKEPOET-602
title: Run-hold hotkey prices an unid unique as a white base
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
  - prices
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-25T04:59:10.052Z'
    comment: Created ticket.
    id: a-2026-11-25t04-59-10-052z
  - type: comment
    user: Agent
    comment: Fixed in PR 917 (c0791ee).
    date: '2026-11-25T05:14:27.395Z'
    completionComment: true
    id: c-2026-11-25t05-14-27-395z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-25T05:14:27.395Z'
  - type: comment
    user: Agent
    comment: Merged at c0791ee; dev build reloaded.
    completionComment: true
    date: '2026-11-25T05:14:32.714Z'
    id: c-2026-11-25t05-14-32-714z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T05:14:33.195Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/917'
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
---
Found in the 2026-11-25 bug hunt (PR 916): the run-hold hotkey prices an unidentified unique as its white base instead of the unique.
