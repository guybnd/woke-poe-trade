---
id: WOKEPOET-389
title: 'G3: price check golden tests: expected trade query per fixture item'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - testing
  - price-check
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-380
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:26:02.171Z'
    comment: Created ticket.
    id: a-2026-11-18t15-26-02-171z
  - type: activity
    user: Agent
    date: '2026-11-18T15:26:02.171Z'
    comment: Created as subtask of WOKEPOET-380.
    id: a-2026-11-18t15-26-02-171z
  - type: comment
    user: Agent
    comment: >-
      PR #641 merged (d1a44add): testing/fixtures/trade-queries.json golden of
      every fixture item's trade query, opened and all-ticked.
    date: '2026-11-18T16:02:39.843Z'
    completionComment: true
    id: c-2026-11-18t16-02-39-843z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T16:02:39.843Z'
  - type: comment
    user: Agent
    comment: 'Merged as d1a44add: trade query golden file.'
    completionComment: true
    date: '2026-11-18T16:02:43.624Z'
    id: c-2026-11-18t16-02-43-624z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T16:02:43.908Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:54.954Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/641'
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
version: '00002'
releasedAt: '2026-11-25T11:52:41.308Z'
releaseDocPath: release-notes/00002
---
Price check has the most bug tickets (~25); 236-240 came from search building (bottom of tier on pseudo totals, catalysed rows, APS/crit/ES). Table of fixture items (testing/fixtures/items) with the trade query each should send, incl. bottom-of-tier and pseudo split variants.
