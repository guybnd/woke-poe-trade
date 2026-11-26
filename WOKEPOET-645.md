---
id: WOKEPOET-645
title: Loot filter profiles (switchable named filters)
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
    date: '2026-11-26T11:15:23.419Z'
    comment: Created ticket.
    id: a-2026-11-26t11-15-23-419z
  - type: activity
    user: Agent
    date: '2026-11-26T11:15:26.383Z'
    comment: Updated implementation link.
    id: a-2026-11-26t11-15-26-383z
  - type: comment
    user: Agent
    comment: 'Waiting on Guy''s picks: https://claude.ai/artifact/6Bi7inGGc7xzRQzV7hh45X'
    date: '2026-11-26T11:15:27.630Z'
    selfAttested: true
    pin: true
    id: c-2026-11-26t11-15-27-630z
  - type: comment
    user: Agent
    comment: PR 969 merged (a60e75f).
    date: '2026-11-26T12:09:11.843Z'
    completionComment: true
    id: c-2026-11-26t12-09-11-843z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-26T12:09:11.844Z'
  - type: comment
    user: Agent
    comment: Merged at a60e75f; dev build reloaded.
    completionComment: true
    date: '2026-11-26T12:09:15.356Z'
    id: c-2026-11-26t12-09-15-356z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T12:09:17.368Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/969'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
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
Switchable, named loot filter profiles. Draft PR: https://github.com/guybnd/woke-poe-trade/pull/969
