---
id: WOKEPOET-636
title: Run summary profit wrong when a listing is left out
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
    date: '2026-11-26T04:37:12.886Z'
    comment: Created ticket.
    id: a-2026-11-26t04-37-12-886z
  - type: comment
    user: Agent
    comment: Merged at 0783230; dev build reloaded.
    completionComment: true
    date: '2026-11-26T04:37:20.036Z'
    id: c-2026-11-26t04-37-20-036z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T04:37:20.490Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:30:52.358Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/959'
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
A left-out listing was coming off run profit in Net worth runs (Guy, 2026-11-26). PR: https://github.com/guybnd/woke-poe-trade/pull/959 (0783230).
