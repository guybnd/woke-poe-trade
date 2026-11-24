---
id: WOKEPOET-545
title: 'Planner: trade search first, stash text second'
status: Done
priority: Low
effort: S
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-528
history:
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:27.130Z'
    comment: Created ticket.
    id: a-2026-11-24t02-41-27-130z
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:27.130Z'
    comment: Created as subtask of WOKEPOET-528.
    id: a-2026-11-24t02-41-27-130z
  - type: status_change
    from: Todo
    to: In Progress
    user: Agent
    date: '2026-11-24T02:57:55.777Z'
  - type: comment
    user: Agent
    comment: >-
      In PR 837 (cloud thread). Picks:
      https://claude.ai/artifact/NDxw8qSC2K18LKRzNnH4CX
    date: '2026-11-24T02:57:58.424Z'
    selfAttested: true
    id: c-2026-11-24t02-57-58-424z
  - type: comment
    user: Agent
    comment: Shipped in PR 837 (b0a2ac30).
    date: '2026-11-24T03:26:42.448Z'
    completionComment: true
    id: c-2026-11-24t03-26-42-448z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T03:26:42.448Z'
  - type: comment
    user: Agent
    comment: Merged at b0a2ac30 from a cloud thread; dev build reloaded.
    completionComment: true
    date: '2026-11-24T03:26:49.185Z'
    id: c-2026-11-24t03-26-49-185z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T03:26:50.568Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/837'
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
Veteran review pick (planner-simple). Lead with the trade search, which can count; show the stash text only when it fits.
