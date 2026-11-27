---
id: WOKEPOET-639
title: 'Instant ninja card, title tips and help cards should follow Size too'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - bug
  - price-check
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-638
history:
  - type: activity
    user: Agent
    date: '2026-11-26T06:46:37.005Z'
    comment: Created ticket.
    id: a-2026-11-26t06-46-37-005z
  - type: activity
    user: Agent
    date: '2026-11-26T06:46:37.005Z'
    comment: Created as subtask of WOKEPOET-638.
    id: a-2026-11-26t06-46-37-005z
  - type: comment
    user: Agent
    comment: Covered by PR 963 (310ee0d).
    date: '2026-11-26T07:02:27.195Z'
    completionComment: true
    id: c-2026-11-26t07-02-27-195z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-26T07:02:27.195Z'
  - type: comment
    user: Agent
    comment: Merged at 310ee0d; dev build reloaded.
    completionComment: true
    date: '2026-11-26T07:02:32.655Z'
    id: c-2026-11-26t07-02-32-655z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T07:02:33.126Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:30:52.009Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/963'
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
version: '0003'
releasedAt: '2026-11-27T04:30:50.393Z'
releaseDocPath: release-notes/0003
---
Follow-up to 638: the instant poe.ninja card, title tips and help cards should also follow the price check Size setting.
