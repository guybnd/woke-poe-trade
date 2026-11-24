---
id: WOKEPOET-559
title: 'Loot filter: tabs fill a resized window'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-24T09:19:45.670Z'
    comment: Created ticket.
    id: a-2026-11-24t09-19-45-670z
  - type: comment
    user: Agent
    comment: Merged at 044f60f7; dev build reloaded.
    completionComment: true
    date: '2026-11-24T09:19:49.415Z'
    id: c-2026-11-24t09-19-49-415z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T09:19:51.150Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/870'
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
Tabs fill a window made taller, with no blank band under Prices. https://github.com/guybnd/woke-poe-trade/pull/870 (merged at 044f60f7).
