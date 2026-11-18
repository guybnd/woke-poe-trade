---
id: WOKEPOET-367
title: 'Price check: show where each cluster notable sits (front/back)'
status: Done
priority: Medium
effort: S
assignee: Agent
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T04:35:10.332Z'
    comment: Created ticket.
    id: a-2026-11-18t04-35-10-332z
  - type: comment
    user: Agent
    comment: >-
      Mocks A/B/C for Guy's pick:
      https://claude.ai/artifact/EwG7BkQXVC2e5qYaqB4k81 (A recommended:
      front/back + points tag on each notable row).
    date: '2026-11-18T04:35:13.917Z'
    selfAttested: true
    id: c-2026-11-18t04-35-13-917z
  - type: activity
    user: Agent
    date: '2026-11-18T04:52:42.812Z'
    comment: >-
      Built Guy's pick A on woke/cluster-type (381f042c + review fix 83080a05),
      merging with #600. Checks green.
    id: a-2026-11-18t04-52-42-812z
  - type: comment
    user: Agent
    comment: 'Notable front/back tags (Guy''s pick A) merged in #600 (09865d0a).'
    date: '2026-11-18T05:05:11.006Z'
    completionComment: true
    id: c-2026-11-18t05-05-11-006z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T05:05:11.006Z'
  - type: comment
    user: Agent
    comment: >-
      Merged in #600 (09865d0a): each cluster notable row ends in front/back +
      points from PoB's ring layout, front first; no tags if a notable is
      unknown to the tree data.
    completionComment: true
    date: '2026-11-18T05:05:15.170Z'
    id: c-2026-11-18t05-05-15-170z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T05:05:15.574Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/600'
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
> **TL;DR:** On a Large (and Medium) cluster price check, show which notables sit at the front (next to the entry) and which at the back, as PoB lays them out, with the points to reach each one. Mocks first, Guy picks.

- Placement logic already exists in `renderer/src/web/woke/pob-builds/cluster-graph.ts` (PoB BuildSubgraph port, notables sorted by `clusters.sortOrder`).
- Cluster data lives in the lazily loaded `public/data/tree/passive-tree.json`.
- Follow-up to WOKEPOET-366.
