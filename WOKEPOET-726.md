---
id: WOKEPOET-726
title: 'Loot tab: redesign the cluster jewel section'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-28T11:40:13.321Z'
    comment: Created ticket.
    id: a-2026-11-28t11-40-13-321z
  - type: activity
    user: Agent
    date: '2026-11-28T11:53:35.550Z'
    comment: >-
      Option A built on cluster-redesign. Review fixes: enchant rows above
      NeverSink clustereco, band rows below (so Rules tab pins and thin-priced
      types still work); Alt+F card sees enchant rows; Medium 6p split at 84;
      under-84 rows only for types also priced at 84+. Waiting on Guy's pick:
      https://claude.ai/artifact/AXpsVm8ATJhj7FKiHedt4g. Known: an edit on an
      enchant row only applies while that row exists; old row names "… other"
      lose their edits.
    id: a-2026-11-28t11-53-35-550z
  - type: activity
    user: Agent
    date: '2026-11-28T12:20:39.844Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/1112 open, CI green,
      mergeable; branch handed to coordinator for dev reload. Blocked on Guy's
      pick (none saved yet): https://claude.ai/artifact/AXpsVm8ATJhj7FKiHedt4g
    id: a-2026-11-28t12-20-39-844z
  - type: comment
    user: Agent
    comment: 'Guy picked A; PR 1112 reviewed, green and merged (fd0c281e).'
    date: '2026-11-28T13:54:40.810Z'
    completionComment: true
    id: c-2026-11-28t13-54-40-810z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-28T13:54:40.810Z'
  - type: comment
    user: Agent
    comment: >-
      Guy picked A. Merged PR 1112: cluster jewels are one Loot section folded
      by size (plus Any size for fractured), band rows and poe.ninja per-enchant
      rows on the Loot ruler, under-84 prices capped at 84+.
    completionComment: true
    date: '2026-11-28T13:54:47.448Z'
    id: c-2026-11-28t13-54-47-448z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T13:54:48.385Z'
needsAction: null
reviewState: approved
baselineCommit: 8289be3944ec8e037ccf214e1ae02b1146f21d66
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1112'
swimlane: null
diffSummary:
  - file: release-next-notes.md
    additions: 1
    deletions: 0
  - file: renderer/src/web/woke/loot-filter/CurrencyCard.vue
    additions: 3
    deletions: 2
  - file: renderer/src/web/woke/loot-filter/currency-weights.ts
    additions: 83
    deletions: 17
  - file: renderer/src/web/woke/loot-filter/unique-classes.ts
    additions: 8
    deletions: 2
  - file: renderer/test/woke/filter-loot-special-rolls.test.ts
    additions: 45
    deletions: 6
---
> **TL;DR:** The cluster jewel part of the Jewels page is two sections priced two ways. Redo it as one section; Guy picks the layout on the mock page, recommended A (a fold per size, band rows + money enchant rows, all on the Loot ruler).

Mock page with picks: https://claude.ai/artifact/AXpsVm8ATJhj7FKiHedt4g (picks/guy in its db). Branch cluster-redesign, worktree wt/cluster-redesign. Don't merge before Guy's pick.
