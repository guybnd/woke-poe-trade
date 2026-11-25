---
id: WOKEPOET-529
title: 'Rarity chip: drop the wrong "fracture" claim'
status: Released
priority: High
effort: XS
assignee: unassigned
tags:
  - bug
  - price-check
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-528
history:
  - type: activity
    user: Agent
    date: '2026-11-24T02:40:59.721Z'
    comment: Created ticket.
    id: a-2026-11-24t02-40-59-721z
  - type: activity
    user: Agent
    date: '2026-11-24T02:40:59.721Z'
    comment: Created as subtask of WOKEPOET-528.
    id: a-2026-11-24t02-40-59-721z
  - type: comment
    user: Agent
    comment: Fixed by PR 829 (8a1647b8).
    date: '2026-11-24T02:55:29.480Z'
    completionComment: true
    id: c-2026-11-24t02-55-29-480z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-24T02:55:29.480Z'
  - type: comment
    user: Agent
    comment: 'Fixed by PR 829 (8a1647b8), from a cloud thread; on the dev build.'
    completionComment: true
    date: '2026-11-24T02:55:36.875Z'
    id: c-2026-11-24t02-55-36-875z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T02:55:37.593Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:59.953Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/829'
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
version: 1.30.20
releasedAt: '2026-11-25T04:05:49.382Z'
releaseDocPath: release-notes/1.30.20
---
Veteran review pick (rarity-copy). RarityChip.vue / rarity-chip.ts say "Magic (bases to recombine or fracture)". Fracturing Orb needs a rare with 4+ mods. Say "Magic: bases with your mods, to regal, essence or recombine".
