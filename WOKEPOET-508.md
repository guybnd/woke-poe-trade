---
id: WOKEPOET-508
title: 'Instant card: Chaos Orb card and div fraction chips'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-23T05:08:26.279Z'
    comment: Created ticket.
    id: a-2026-11-23t05-08-26-279z
  - type: comment
    user: Agent
    comment: Merged (b0d36b78) with review fixes.
    completionComment: true
    date: '2026-11-23T05:08:29.662Z'
    id: c-2026-11-23t05-08-29-662z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-23T05:08:30.211Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:49.100Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/790'
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
version: '0001'
releasedAt: '2026-11-25T11:50:45.359Z'
releaseDocPath: release-notes/0001
---
Guy: fraction price chips on the div and chaos fast checks. PR https://github.com/guybnd/woke-poe-trade/pull/790 merged (b0d36b78): Chaos Orb gets the instant card (only with a known divine rate) with 10c/50c/100c-in-div chips; Divine row as chips.
