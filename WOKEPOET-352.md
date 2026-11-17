---
id: WOKEPOET-352
title: 'Prices tab "Not moved": bulk Unlock and Move anyway, plus Undo'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
  - prices
  - ux
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:01:14.882Z'
    comment: Created ticket.
    id: a-2026-11-17t09-01-14-882z
  - type: comment
    user: Agent
    comment: >-
      Merged as 166d523e: Prices tab "Not moved" bulk Unlock and Move anyway,
      plus Undo.
    completionComment: true
    date: '2026-11-17T09:01:19.410Z'
    id: c-2026-11-17t09-01-19-410z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-17T09:01:19.810Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/573'
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
> **TL;DR:** The Prices tab's "Not moved" list gets bulk Unlock and Move anyway, with Undo. Adds an optional `hides` field to PriceSkip in economy.ts. Shipped in PR 573 (merged 166d523e).
