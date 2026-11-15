---
id: WOKEPOET-300
title: 'Investments: bundled leagues leave out empty variant/links'
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
    date: '2026-11-15T05:20:27.929Z'
    comment: Created ticket.
    id: a-2026-11-15t05-20-27-929z
  - type: comment
    user: Agent
    comment: 'Merged #490 on 2026-11-15.'
    completionComment: true
    date: '2026-11-15T05:20:45.993Z'
    id: c-2026-11-15t05-20-45-993z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:20:46.359Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/490'
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
League-start investment data bundled with the app drops empty variant and links fields, about 60 KB less JavaScript. Shipped in PR #490.
