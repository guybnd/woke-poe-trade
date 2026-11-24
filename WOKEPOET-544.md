---
id: WOKEPOET-544
title: 'One in-map overlay on by default (glance bar on, toast off)'
status: Done
priority: Medium
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
    date: '2026-11-24T02:41:25.748Z'
    comment: Created ticket.
    id: a-2026-11-24t02-41-25-748z
  - type: activity
    user: Agent
    date: '2026-11-24T02:41:25.748Z'
    comment: Created as subtask of WOKEPOET-528.
    id: a-2026-11-24t02-41-25-748z
  - type: activity
    user: Agent
    date: '2026-11-24T02:55:38.435Z'
    comment: 'In PR 836 (cloud thread), pending CI.'
    id: a-2026-11-24t02-55-38-435z
  - type: comment
    user: Agent
    comment: Shipped in PR 836 (6343ecd0).
    date: '2026-11-24T04:41:10.104Z'
    completionComment: true
    id: c-2026-11-24t04-41-10-104z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-24T04:41:10.104Z'
  - type: comment
    user: Agent
    comment: Merged at 6343ecd0 from a cloud thread; dev build reloaded.
    completionComment: true
    date: '2026-11-24T04:41:18.167Z'
    id: c-2026-11-24t04-41-18-167z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T04:41:19.090Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/836'
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
Veteran review pick (overlay-one). Glance bar on, after-map toast off by default; the bar flashes the map's result for a few seconds instead. Toast can be turned back on.
