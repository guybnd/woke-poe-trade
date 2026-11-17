---
id: WOKEPOET-345
title: 'Loot filter Prices: bulk pick Would move items'
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-17T03:29:57.534Z'
    comment: Created ticket.
    id: a-2026-11-17t03-29-57-534z
  - type: activity
    user: Agent
    date: '2026-11-17T03:30:01.074Z'
    comment: Updated implementation link.
    id: a-2026-11-17t03-30-01-074z
  - type: comment
    user: Agent
    comment: >-
      Merged as 533f53df: pick-all box with count, all / none / up only / down
      only, shift + click ranges on the Prices tab's Would move list.
    completionComment: true
    date: '2026-11-17T03:40:39.441Z'
    id: c-2026-11-17t03-40-39-441z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-17T03:40:39.948Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/561'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
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
> **TL;DR** Guy asked why he can't bulk pick the "Would move" rows on the Prices tab. Added a pick-all box, all / none / up only / down only, and shift + click ranges. PR #561.

Branch woke/prices-bulk-pick, worktree E:\Git\woke\wt\prices-bulk-pick. Local checks passed (vue-tsc, eslint, vitest test/woke, vite build). Awaiting merge via the cloud merge thread.
