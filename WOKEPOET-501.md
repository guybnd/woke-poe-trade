---
id: WOKEPOET-501
title: 'Remaining under-11px text, plus a unit check'
status: Released
priority: None
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-491
history:
  - type: activity
    user: Agent
    date: '2026-11-23T04:01:00.444Z'
    comment: Created ticket.
    id: a-2026-11-23t04-01-00-444z
  - type: activity
    user: Agent
    date: '2026-11-23T04:01:00.444Z'
    comment: Created as subtask of WOKEPOET-491.
    id: a-2026-11-23t04-01-00-444z
  - type: comment
    user: Agent
    comment: Shipped in PR 788 (merged at b0b603d6).
    date: '2026-11-23T04:27:45.493Z'
    completionComment: true
    id: c-2026-11-23t04-27-45-493z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-23T04:27:45.493Z'
  - type: comment
    user: Agent
    comment: 'No text under 11px, with a unit check, shipped in PR 788 (b0b603d6).'
    completionComment: true
    date: '2026-11-23T04:27:52.208Z'
    id: c-2026-11-23t04-27-52-208z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-23T04:27:53.279Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:49.561Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/788'
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
Plan C (Guy's pick). Fix the remaining text under 11px: price check chips, Bulk, dock badges. Add a unit check so it stays fixed.
