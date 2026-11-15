---
id: WOKEPOET-295
title: 'Filter search: find rares by title, match pasted items'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
  - loot-filter
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:20:21.422Z'
    comment: Created ticket.
    id: a-2026-11-15t05-20-21-422z
  - type: comment
    user: Agent
    comment: 'Merged #485 on 2026-11-15.'
    completionComment: true
    date: '2026-11-15T05:20:41.193Z'
    id: c-2026-11-15t05-20-41-193z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:20:41.567Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/485'
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
The loot filter item search couldn't find a rare by its full title (Guy's "Doom Nails, Spike-Point Arrow Quiver"). A query holding an item's whole name now finds it first, a pasted in-game copy shows a Pasted row with its real mods and item level, and no match explains that rare names are random. Shipped in PR #485.
