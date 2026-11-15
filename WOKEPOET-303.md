---
id: WOKEPOET-303
title: 'Market tab redesign: poe.ninja-style market browser'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
  - mocks
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:20:49.556Z'
    comment: Created ticket.
    id: a-2026-11-15t05-20-49-556z
  - type: activity
    user: Agent
    date: '2026-11-15T06:03:02.090Z'
    comment: >-
      PR #498. Picks page: https://claude.ai/artifact/EygXZ8EoYyhfzF1JwcQ3Bj.
      Guy picked A, with C's actions in a right-click menu plus category icons
      (being added now).
    id: a-2026-11-15t06-03-02-090z
  - type: activity
    user: Agent
    date: '2026-11-15T06:03:02.829Z'
    comment: Updated implementation link.
    id: a-2026-11-15t06-03-02-829z
  - type: comment
    user: Agent
    comment: >-
      Merged #498 (46bef80b): Market tab as a poe.ninja-style browser, layout A
      with C's actions in a right-click menu and category icons.
    date: '2026-11-15T06:47:05.946Z'
    completionComment: true
    id: c-2026-11-15t06-47-05-946z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-15T06:47:05.946Z'
  - type: comment
    user: Agent
    comment: 'Merged #498 (46bef80b).'
    completionComment: true
    date: '2026-11-15T06:47:14.423Z'
    id: c-2026-11-15t06-47-14-423z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T06:47:15.033Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/498'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
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
Redesign the Market tab as a poe.ninja-style browser of item prices. Layout mocks are with Guy; build starts once he picks one. Work happens in the project thread "Add a poe.ninja-style market browser".
