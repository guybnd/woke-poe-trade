---
id: WOKEPOET-706
title: 'Levelling 7: gems + uniques while levelling'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-699
history:
  - type: activity
    user: Agent
    date: '2026-11-28T05:35:06.654Z'
    comment: Created ticket.
    id: a-2026-11-28t05-35-06-654z
  - type: activity
    user: Agent
    date: '2026-11-28T05:35:06.654Z'
    comment: Created as subtask of WOKEPOET-699.
    id: a-2026-11-28t05-35-06-654z
  - type: status_change
    from: Todo
    to: In Progress
    user: Agent
    date: '2026-11-28T07:06:44.957Z'
  - type: activity
    user: Agent
    date: '2026-11-28T07:06:55.611Z'
    comment: >-
      PR 1069 (merged as 0946eea) built gems and uniques while levelling.
      Quest-like items are not done yet.
    id: a-2026-11-28t07-06-55-611z
  - type: comment
    user: Agent
    comment: Quest-like items done in PR 1080 (merged as 847f21a).
    date: '2026-11-28T09:05:36.171Z'
    completionComment: true
    id: c-2026-11-28t09-05-36-171z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-28T09:05:36.171Z'
  - type: comment
    user: Agent
    comment: 'Gems + uniques in PR 1069, quest-like items in PR 1080 (847f21a).'
    completionComment: true
    date: '2026-11-28T09:05:39.617Z'
    id: c-2026-11-28t09-05-39-617z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T09:05:40.407Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1080'
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
Gems and uniques while levelling.
