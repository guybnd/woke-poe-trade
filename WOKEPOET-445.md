---
id: WOKEPOET-445
title: >-
  Bug hunt: Incarnation arenas no longer count as maps; Ctrl+Space session cards
  fixes
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T09:11:31.250Z'
    comment: Created ticket.
    id: a-2026-11-21t09-11-31-250z
  - type: comment
    user: Agent
    comment: >-
      Merged as 0c632e2 (cloud bug-hunt thread): Incarnation arenas no longer
      count as maps; Ctrl+Space session card fixes.
    completionComment: true
    date: '2026-11-21T09:11:38.008Z'
    id: c-2026-11-21t09-11-38-008z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T09:11:38.440Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:59.608Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/719'
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
version: '0001'
releasedAt: '2026-11-25T11:50:45.359Z'
releaseDocPath: release-notes/0001
---
Done in a cloud bug-hunt thread. PR: https://github.com/guybnd/woke-poe-trade/pull/719 (merged 0c632e2).
