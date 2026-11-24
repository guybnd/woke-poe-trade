---
id: WOKEPOET-527
title: 'Listed tab: filtered total for the picked chip'
status: Done
priority: Medium
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-24T02:40:32.608Z'
    comment: Created ticket.
    id: a-2026-11-24t02-40-32-608z
  - type: comment
    user: Agent
    comment: >-
      PR 833 merged (5e968770): Listed head follows the picked chip. T16 "—" is
      expected (ninja's plain base is 2c); folding rare maps was taken out after
      review.
    date: '2026-11-24T02:49:55.740Z'
    completionComment: true
    id: c-2026-11-24t02-49-55-740z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T02:49:55.740Z'
  - type: comment
    user: Agent
    comment: >-
      Listed tab head (asking, count, worth about) totals the picked chip's
      rows. Rare 3.30 T16 maps keep "—": poe.ninja prices the plain base at 2c.
    completionComment: true
    date: '2026-11-24T02:50:02.856Z'
    id: c-2026-11-24t02-50-02-856z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T02:50:03.375Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/833'
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
Guy: with a section chip picked (e.g. Maps 51), the Listed head should show that chip's asking total, count and worth. Also: rolled T16 maps (3.30 base "Map (Tier 16)") show "—" in Suggest/vs ninja; poe.ninja prices that base at 2c, so no suggestion is right for maps listed far over it. Branch fix/listed-filter-total.
