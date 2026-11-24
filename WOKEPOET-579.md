---
id: WOKEPOET-579
title: Redesign the bulk exchange results
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-24T15:54:03.692Z'
    comment: Created ticket.
    id: a-2026-11-24t15-54-03-692z
  - type: comment
    user: Agent
    comment: Merged at 9882627; dev build reloaded.
    completionComment: true
    date: '2026-11-24T15:54:08.196Z'
    id: c-2026-11-24t15-54-08-196z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T15:54:08.647Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/892'
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
Exchange results: one row per price, Buy N total, amount and Whisper per seller. PR: https://github.com/guybnd/woke-poe-trade/pull/892 (9882627).
