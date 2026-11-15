---
id: WOKEPOET-327
title: 'Boss runs: search trade only on a click'
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
    date: '2026-11-15T13:48:15.045Z'
    comment: Created ticket.
    id: a-2026-11-15t13-48-15-045z
  - type: comment
    user: Agent
    comment: 'Merged in PR #533 (9cd50332). The dev overlay was reloaded on master.'
    date: '2026-11-15T13:48:20.831Z'
    completionComment: true
    id: c-2026-11-15t13-48-20-831z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T13:48:20.831Z'
  - type: comment
    user: Agent
    comment: 'Merged as 9cd50332: Boss runs searches trade only on a click.'
    completionComment: true
    date: '2026-11-15T13:48:25.598Z'
    id: c-2026-11-15t13-48-25-598z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T13:48:26.012Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/533'
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
> **TL;DR:** Boss runs now searches the trade site only when you click. Built and merged in PR #533 (9cd50332); this ticket records it.
