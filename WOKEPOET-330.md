---
id: WOKEPOET-330
title: >-
  Loot filter rules: Show from picker, T16 on its own row, Maps to hide as
  switches
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
    date: '2026-11-15T15:28:29.120Z'
    comment: Created ticket.
    id: a-2026-11-15t15-28-29-120z
  - type: comment
    user: Agent
    comment: 'Merged in PR #537 (3ce69a1b). The dev overlay was reloaded on master.'
    date: '2026-11-15T15:28:33.777Z'
    completionComment: true
    id: c-2026-11-15t15-28-33-777z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T15:28:33.777Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 3ce69a1b: loot filter rules have a Show from picker, T16 on its
      own row, and switches for the maps to hide.
    completionComment: true
    date: '2026-11-15T15:28:38.316Z'
    id: c-2026-11-15t15-28-38-316z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T15:28:38.913Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/537'
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
> **TL;DR:** Loot filter rules get a Show from picker, T16 on its own row, and switches for the maps to hide. Built and merged in PR #537 (3ce69a1b); this ticket records it.
