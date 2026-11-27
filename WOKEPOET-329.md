---
id: WOKEPOET-329
title: 'Loot filter ?: hotkeys as key chips'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-15T14:02:31.927Z'
    comment: Created ticket.
    id: a-2026-11-15t14-02-31-927z
  - type: comment
    user: Agent
    comment: 'Merged in PR #536 (687aac4e). The dev overlay was reloaded on master.'
    date: '2026-11-15T14:02:42.131Z'
    completionComment: true
    id: c-2026-11-15t14-02-42-131z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T14:02:42.131Z'
  - type: comment
    user: Agent
    comment: 'Merged as 687aac4e: the loot filter ? tip shows its hotkeys as key chips.'
    completionComment: true
    date: '2026-11-15T14:02:48.263Z'
    id: c-2026-11-15t14-02-48-263z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T14:02:48.719Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:10:01.679Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/536'
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
version: '000012'
releasedAt: '2026-11-27T16:09:47.375Z'
releaseDocPath: release-notes/000012
---
> **TL;DR:** The loot filter ? tip shows its hotkeys as boxed key chips. Built and merged in PR #536 (687aac4e); this ticket records it.
