---
id: WOKEPOET-296
title: 'Claude link: local MCP server and Suggestions dock card'
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
    date: '2026-11-15T05:20:22.689Z'
    comment: Created ticket.
    id: a-2026-11-15t05-20-22-689z
  - type: comment
    user: Agent
    comment: 'Merged #486 on 2026-11-15.'
    completionComment: true
    date: '2026-11-15T05:20:42.144Z'
    id: c-2026-11-15t05-20-42-144z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:20:42.572Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/486'
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
A local MCP server lets Claude read the toolkit's state, and a Suggestions dock card shows what it sends back (Guy picked A + T2 + S1). Shipped in PR #486.
