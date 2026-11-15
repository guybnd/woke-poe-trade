---
id: WOKEPOET-312
title: 'Character: build items and gems you can''t wear yet (idea 14)'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - pob
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-304
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:38:24.485Z'
    comment: Created ticket.
    id: a-2026-11-15t05-38-24-485z
  - type: activity
    user: Agent
    date: '2026-11-15T05:38:24.485Z'
    comment: Created as subtask of WOKEPOET-304.
    id: a-2026-11-15t05-38-24-485z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/508 (with 311), reviewed,
      sent to merge.
    date: '2026-11-15T06:41:33.823Z'
    selfAttested: true
    id: c-2026-11-15t06-41-33-823z
  - type: comment
    user: Agent
    comment: 'Can''t use yet, merged in #508.'
    date: '2026-11-15T07:58:57.291Z'
    completionComment: true
    id: c-2026-11-15t07-58-57-291z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T07:58:57.291Z'
  - type: comment
    user: Agent
    comment: 'Merged in #508.'
    completionComment: true
    date: '2026-11-15T07:58:58.183Z'
    id: c-2026-11-15t07-58-58-183z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T07:58:58.465Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/508'
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
Level and attribute requirements of build items/gems against the character, what's short and the nearest node that fixes it. Needs attributes (blocked on item mods, #497).
