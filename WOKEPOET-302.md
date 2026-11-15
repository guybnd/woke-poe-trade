---
id: WOKEPOET-302
title: 'Investments: fetch past leagues as JSON, prices in typed arrays'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - perf
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:20:30.693Z'
    comment: Created ticket.
    id: a-2026-11-15t05-20-30-693z
  - type: comment
    user: Agent
    comment: 'Merged #494 on 2026-11-15.'
    completionComment: true
    date: '2026-11-15T05:20:47.896Z'
    id: c-2026-11-15t05-20-47-896z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:20:48.281Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/494'
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
Past league investment data is fetched as JSON and its prices kept in typed arrays, about 1.7 MB less memory. Shipped in PR #494.
