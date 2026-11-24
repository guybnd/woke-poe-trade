---
id: WOKEPOET-533
title: 'Map checks: pick a farming goal (Currency or Maps and Threads)'
status: Done
priority: High
effort: M
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-528
history:
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:06.526Z'
    comment: Created ticket.
    id: a-2026-11-24t02-41-06-526z
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:06.526Z'
    comment: Created as subtask of WOKEPOET-528.
    id: a-2026-11-24t02-41-06-526z
  - type: status_change
    from: Todo
    to: In Progress
    user: Agent
    date: '2026-11-24T02:57:55.182Z'
  - type: comment
    user: Agent
    comment: >-
      In PR 837 (cloud thread). Picks:
      https://claude.ai/artifact/NDxw8qSC2K18LKRzNnH4CX
    date: '2026-11-24T02:57:57.434Z'
    selfAttested: true
    id: c-2026-11-24t02-57-57-434z
  - type: comment
    user: Agent
    comment: Shipped in PR 837 (b0a2ac30).
    date: '2026-11-24T03:26:41.441Z'
    completionComment: true
    id: c-2026-11-24t03-26-41-441z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T03:26:41.441Z'
  - type: comment
    user: Agent
    comment: Merged at b0a2ac30 from a cloud thread; dev build reloaded.
    completionComment: true
    date: '2026-11-24T03:26:47.859Z'
    id: c-2026-11-24t03-26-47-859z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T03:26:48.829Z'
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
Veteran review pick (map-goal). Currency turns on Rarity, Pack size, More Currency; Maps and Threads turns on Atlas Drops, More Maps, More Threads (3.30 Atlas Drops affect only maps/threads/league resources). One remembered setting, also the Planner default.
