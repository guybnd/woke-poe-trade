---
id: WOKEPOET-421
title: 'Session story: more log facts and Farming profit'
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
    date: '2026-11-20T15:14:52.030Z'
    comment: Created ticket.
    id: a-2026-11-20t15-14-52-030z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/685, review fixes in,
      cloud checks green, sent to merge.
    date: '2026-11-20T15:24:50.847Z'
    completionComment: true
    id: c-2026-11-20t15-24-50-847z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-20T15:24:50.847Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 9a988bc0: average map, maps per hour, level-ups, longest break,
      Farming profit fallback.
    completionComment: true
    date: '2026-11-20T15:30:26.107Z'
    id: c-2026-11-20t15-30-26-107z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T15:30:26.580Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/685'
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
Guy's picks (2026-11-20) from the facts list: 1 average map time, 4 maps per hour, 7 level-ups, 10 longest break between maps, 12 Farming loot profit when the stash reader didn't read. Drop the stash-reader note. Branch woke/session-facts.
