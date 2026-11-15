---
id: WOKEPOET-307
title: 'Character: next upgrades ranked with prices (idea 2)'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - pob
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-304
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:38:15.937Z'
    comment: Created ticket.
    id: a-2026-11-15t05-38-15-937z
  - type: activity
    user: Agent
    date: '2026-11-15T05:38:15.937Z'
    comment: Created as subtask of WOKEPOET-304.
    id: a-2026-11-15t05-38-15-937z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/500 (stacked on #499),
      reviewed, sent to merge.
    date: '2026-11-15T05:55:17.675Z'
    selfAttested: true
    id: c-2026-11-15t05-55-17-675z
  - type: comment
    user: Agent
    comment: 'Shipped in #500 (85d0cbc3): next upgrades ranked with prices.'
    date: '2026-11-15T06:15:03.494Z'
    completionComment: true
    id: c-2026-11-15t06-15-03-494z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T06:15:03.494Z'
  - type: comment
    user: Agent
    comment: 'Merged #500 (85d0cbc3).'
    completionComment: true
    date: '2026-11-15T06:15:10.377Z'
    id: c-2026-11-15t06-15-10-377z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T06:15:11.104Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/500'
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
Slots that differ, ranked cheapest big step first, poe.ninja price for uniques, trade search button per slot, total to finish the build.
