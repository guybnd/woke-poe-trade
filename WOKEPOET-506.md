---
id: WOKEPOET-506
title: 'Instant card: 1-day price line and change, labelled 1d'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-23T04:34:29.331Z'
    comment: Created ticket.
    id: a-2026-11-23t04-34-29-331z
  - type: comment
    user: Agent
    comment: 'Merged (ac2ff547), review fixes included.'
    completionComment: true
    date: '2026-11-23T04:34:32.205Z'
    id: c-2026-11-23t04-34-32-205z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-23T04:34:33.046Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/789'
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
Guy: sparkline + % on the instant poe.ninja card should cover 1d and say so. PR https://github.com/guybnd/woke-poe-trade/pull/789 merged (ac2ff547): saved snapshots over 24h (7 points, 400 ms wait, no flip), else poe.ninja's last two days; "1d" label; hover says the source.
