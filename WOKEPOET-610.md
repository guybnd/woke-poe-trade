---
id: WOKEPOET-610
title: Ctrl+Space pressed right after start opens the search
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-25T07:25:13.207Z'
    comment: Created ticket.
    id: a-2026-11-25t07-25-13-207z
  - type: comment
    user: Agent
    comment: Merged at 9df764b; dev build reloaded.
    completionComment: true
    date: '2026-11-25T07:25:18.160Z'
    id: c-2026-11-25t07-25-18-160z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T07:25:18.812Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/927'
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
An early Ctrl+Space press, before the lazy search widget mounted, was lost; now it opens the search. PR: https://github.com/guybnd/woke-poe-trade/pull/927 (9df764b).
