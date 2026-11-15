---
id: WOKEPOET-332
title: 'Loot filter: make unsaved changes obvious, Ctrl+S to save'
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
    date: '2026-11-15T15:54:01.664Z'
    comment: Created ticket.
    id: a-2026-11-15t15-54-01-664z
  - type: comment
    user: Agent
    comment: 'Merged in PR #539 (7fae8592). The dev overlay was reloaded on master.'
    date: '2026-11-15T15:54:05.878Z'
    completionComment: true
    id: c-2026-11-15t15-54-05-878z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T15:54:05.878Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 7fae8592: the loot filter makes unsaved changes obvious, and
      Ctrl+S saves.
    completionComment: true
    date: '2026-11-15T15:54:10.786Z'
    id: c-2026-11-15t15-54-10-786z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T15:54:11.194Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/539'
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
> **TL;DR:** The loot filter editor now makes unsaved changes obvious, and Ctrl+S saves. Built and merged in PR #539 (7fae8592); this ticket records it.
