---
id: WOKEPOET-655
title: Make item tooltips follow the Size setting
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-27T04:59:07.666Z'
    comment: Created ticket.
    id: a-2026-11-27t04-59-07-666z
  - type: comment
    user: Agent
    comment: >-
      Done across PRs 963 and 965 (195c7be). Reaches the dev build when it
      switches back to master after PR 985.
    completionComment: true
    date: '2026-11-27T04:59:13.488Z'
    id: c-2026-11-27t04-59-13-488z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-27T04:59:13.870Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/965'
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
Item tooltips follow the price check Size setting (PR 963, see WOKEPOET-638) and shrink to fit the screen at a big Size (PR 965). PRs: https://github.com/guybnd/woke-poe-trade/pull/963 and https://github.com/guybnd/woke-poe-trade/pull/965 (195c7be).
