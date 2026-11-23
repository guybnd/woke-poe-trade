---
id: WOKEPOET-513
title: Fix filter check on related-item price checks
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
    date: '2026-11-23T09:33:30.378Z'
    comment: Created ticket.
    id: a-2026-11-23t09-33-30-378z
  - type: comment
    user: Agent
    comment: Merged at f4292f16; dev build reloaded onto it.
    completionComment: true
    date: '2026-11-23T09:33:32.685Z'
    id: c-2026-11-23t09-33-32-685z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-23T09:33:33.140Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/799'
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
Items price checked from the related/side list had their filter chip judged wrongly (fragments treated as currency). Fixed in a cloud thread: https://github.com/guybnd/woke-poe-trade/pull/799 (merged at f4292f16).
