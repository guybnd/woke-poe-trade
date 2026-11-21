---
id: WOKEPOET-464
title: Price check finds no listings for Cortex from Ctrl+Space
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T14:47:00.984Z'
    comment: Created ticket.
    id: a-2026-11-21t14-47-00-984z
  - type: comment
    user: Agent
    comment: >-
      Merged PR 745: Cortex/Replica Cortex virtual items marked corrupted so
      price check searches "any". Review clean; checks green.
    date: '2026-11-21T14:54:25.270Z'
    completionComment: true
    id: c-2026-11-21t14-54-25-270z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T14:54:25.270Z'
  - type: comment
    user: Agent
    comment: >-
      Price check of Cortex/Replica Cortex without game text now searches
      corrupted copies (they only drop corrupted). Unit test; reviewed; checks
      green.
    completionComment: true
    date: '2026-11-21T14:54:31.899Z'
    id: c-2026-11-21t14-54-31-899z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T14:54:32.875Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/745'
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
Guy: after PR 740, Trade site works for Cortex but price check doesn't. Cause: a unique priced without game text is treated as uncorrupted, and Cortex/Replica Cortex only exist corrupted (trade: corrupted=false → 0 of ~1669 listings). Fix: mark them corrupted in virtualUnique so the search uses "any". Branch woke/cortex-price-check.
