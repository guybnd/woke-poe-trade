---
id: WOKEPOET-708
title: 'Loot filter: "Every page" global step row restored'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-649
history:
  - type: activity
    user: Agent
    date: '2026-11-28T05:45:23.490Z'
    comment: Created ticket.
    id: a-2026-11-28t05-45-23-490z
  - type: activity
    user: Agent
    date: '2026-11-28T05:45:23.490Z'
    comment: Created as subtask of WOKEPOET-649.
    id: a-2026-11-28t05-45-23-490z
  - type: comment
    user: Agent
    comment: Merged at 89950b2; dev build reloaded.
    completionComment: true
    date: '2026-11-28T05:45:29.987Z'
    id: c-2026-11-28t05-45-29-987z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T05:45:30.997Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1058'
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
An "Every page" step row above the page and section ones. PR: https://github.com/guybnd/woke-poe-trade/pull/1058 (89950b2).
