---
id: WOKEPOET-290
title: 'Maps: read 3.30''s Atlas Drops line'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - '3.30'
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:20:14.185Z'
    comment: Created ticket.
    id: a-2026-11-15t05-20-14-185z
  - type: comment
    user: Agent
    comment: 'Merged #479 on 2026-11-14.'
    completionComment: true
    date: '2026-11-15T05:20:36.386Z'
    id: c-2026-11-15t05-20-36-386z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:20:36.718Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/479'
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
Map reading understands 3.30's new Atlas Drops line (tiered drop minimum). Shipped in PR #479.
