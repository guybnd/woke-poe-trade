---
id: WOKEPOET-607
title: Price card redesign
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
    date: '2026-11-25T07:00:46.859Z'
    comment: Created ticket.
    id: a-2026-11-25t07-00-46-859z
  - type: comment
    user: Agent
    comment: Merged at deadfaf; dev build reloaded for Guy to try.
    completionComment: true
    date: '2026-11-25T07:00:50.737Z'
    id: c-2026-11-25t07-00-50-737z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T07:00:51.392Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/907'
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
Price card redesign: exchange rates, graph box, stays by the mouse. PR: https://github.com/guybnd/woke-poe-trade/pull/907 (deadfaf).
