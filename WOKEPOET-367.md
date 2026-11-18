---
id: WOKEPOET-367
title: 'Price check: show where each cluster notable sits (front/back)'
status: Grooming
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
---
> **TL;DR:** On a Large (and Medium) cluster price check, show which notables sit at the front (next to the entry) and which at the back, as PoB lays them out, with the points to reach each one. Mocks first, Guy picks.

- Placement logic already exists in `renderer/src/web/woke/pob-builds/cluster-graph.ts` (PoB BuildSubgraph port, notables sorted by `clusters.sortOrder`).
- Cluster data lives in the lazily loaded `public/data/tree/passive-tree.json`.
- Follow-up to WOKEPOET-366.
