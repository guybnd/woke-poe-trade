---
id: WOKEPOET-575
title: Div card rarity on price check and tooltip
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
    date: '2026-11-24T14:29:12.885Z'
    comment: Created ticket.
    id: a-2026-11-24t14-29-12-885z
  - type: comment
    user: Agent
    comment: Merged at 6120e7b; dev build reloaded.
    completionComment: true
    date: '2026-11-24T14:29:16.551Z'
    id: c-2026-11-24t14-29-16-551z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T14:29:17.129Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/883'
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
Div cards show their "1 in N" rarity on the price check and the tooltip. PR: https://github.com/guybnd/woke-poe-trade/pull/883 (6120e7b).
