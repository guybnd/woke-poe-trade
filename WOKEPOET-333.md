---
id: WOKEPOET-333
title: 'Loot filter rule list: up row on every folder, mouse back/forward'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T16:09:55.062Z'
    comment: Created ticket.
    id: a-2026-11-15t16-09-55-062z
  - type: comment
    user: Agent
    comment: 'Merged in PR #540 (2f7787c2). The dev overlay was reloaded on master.'
    date: '2026-11-15T16:09:59.680Z'
    completionComment: true
    id: c-2026-11-15t16-09-59-680z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T16:09:59.680Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 2f7787c2: every folder in the loot filter rule list has an up
      row, and the mouse back/forward buttons work.
    completionComment: true
    date: '2026-11-15T16:10:04.308Z'
    id: c-2026-11-15t16-10-04-308z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T16:10:04.689Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/540'
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
> **TL;DR:** Every folder in the loot filter rule list has an up ("Back to") row, and the mouse back/forward buttons move between folders. Built and merged in PR #540 (2f7787c2); this ticket records it.
