---
id: WOKEPOET-308
title: 'Character: jewels and clusters against the build (idea 15)'
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
    date: '2026-11-15T05:38:17.990Z'
    comment: Created ticket.
    id: a-2026-11-15t05-38-17-990z
  - type: activity
    user: Agent
    date: '2026-11-15T05:38:17.990Z'
    comment: Created as subtask of WOKEPOET-304.
    id: a-2026-11-15t05-38-17-990z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/502 (stacked on #500),
      reviewed, sent to merge. Cluster notables and timeless seed compare not
      covered.
    date: '2026-11-15T06:03:21.599Z'
    selfAttested: true
    id: c-2026-11-15t06-03-21-599z
  - type: comment
    user: Agent
    comment: >-
      Merged #502 (7018f3e0): Jewels section on the Character tab, the build's
      jewel against yours per socket.
    date: '2026-11-15T06:47:06.952Z'
    completionComment: true
    id: c-2026-11-15t06-47-06-952z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T06:47:06.952Z'
  - type: comment
    user: Agent
    comment: 'Merged #502 (7018f3e0).'
    completionComment: true
    date: '2026-11-15T06:47:15.266Z'
    id: c-2026-11-15t06-47-15-266z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T06:47:15.824Z'
  - type: comment
    user: Agent
    comment: 'Jewels against the build, merged in #502.'
    date: '2026-11-15T07:58:49.296Z'
    completionComment: true
    id: c-2026-11-15t07-58-49-296z
  - type: status_change
    from: Done
    to: Ready
    user: Agent
    date: '2026-11-15T07:58:49.296Z'
  - type: comment
    user: Agent
    comment: 'Merged in #502.'
    completionComment: true
    date: '2026-11-15T07:58:50.199Z'
    id: c-2026-11-15t07-58-50-199z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T07:58:50.468Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/502'
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
Socketed jewels vs build's: empty sockets, missing cluster notables, timeless mismatch. Needs tree.json jewelSlots (GGG x index → node) added to tree data. Cluster passives are excluded from the tree compare today (GGG hashes_ex ids ≠ PoB 65536+ ids).
