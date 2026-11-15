---
id: WOKEPOET-311
title: 'Character: resists and attributes from gear and tree (idea 4)'
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
    date: '2026-11-15T05:38:22.793Z'
    comment: Created ticket.
    id: a-2026-11-15t05-38-22-793z
  - type: activity
    user: Agent
    date: '2026-11-15T05:38:22.793Z'
    comment: Created as subtask of WOKEPOET-304.
    id: a-2026-11-15t05-38-22-793z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/508 (with 312), reviewed,
      sent to merge.
    date: '2026-11-15T06:41:32.776Z'
    selfAttested: true
    id: c-2026-11-15t06-41-32-776z
  - type: comment
    user: Agent
    comment: 'Resists and attributes, merged in #508.'
    date: '2026-11-15T07:58:55.386Z'
    completionComment: true
    id: c-2026-11-15t07-58-55-386z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T07:58:55.386Z'
  - type: comment
    user: Agent
    comment: 'Merged in #508.'
    completionComment: true
    date: '2026-11-15T07:58:56.296Z'
    id: c-2026-11-15t07-58-56-296z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T07:58:56.597Z'
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
Totals from worn gear + tree, uncapped resists, what a planned swap breaks. Blocked on item mods parsing (#497).
