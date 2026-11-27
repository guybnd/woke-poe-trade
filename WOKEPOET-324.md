---
id: WOKEPOET-324
title: 'Unidentified prices for rolled jewels (Boss runs, Search, tooltip)'
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
    date: '2026-11-15T13:27:51.822Z'
    comment: Created ticket.
    id: a-2026-11-15t13-27-51-822z
  - type: comment
    user: Agent
    comment: 'Merged in PR #526 (6133a3a8). The dev overlay was reloaded on master.'
    date: '2026-11-15T13:27:58.608Z'
    completionComment: true
    id: c-2026-11-15t13-27-58-608z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T13:27:58.609Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 6133a3a8: unidentified prices for rolled jewels in Boss runs,
      Search and the tooltip.
    completionComment: true
    date: '2026-11-15T13:28:05.190Z'
    id: c-2026-11-15t13-28-05-190z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T13:28:05.584Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:10:17.978Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/526'
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
version: '00024'
releasedAt: '2026-11-27T16:10:17.975Z'
releaseDocPath: release-notes/00024
---
> **TL;DR:** Boss runs, Search and the item tooltip now show unidentified prices for rolled jewels. Built and merged in PR #526 (6133a3a8); this ticket records it.
