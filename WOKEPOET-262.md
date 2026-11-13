---
id: WOKEPOET-262
title: 'Price from search fails on uniques: Unknown item base type'
status: Done
priority: High
effort: XS
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-13T04:46:41.534Z'
    comment: Created ticket.
    id: a-2026-11-13t04-46-41-534z
  - type: comment
    user: Agent
    comment: >-
      PR #411 merged (e8744f6a). Virtual uniques now carry uniqueBase +
      category.
    date: '2026-11-13T04:55:54.288Z'
    completionComment: true
    id: c-2026-11-13t04-55-54-288z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-13T04:55:54.288Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as e8744f6a. Price from the item menu / search now sends the
      unique's base type (Mageblood → Heavy Belt).
    completionComment: true
    date: '2026-11-13T04:56:00.375Z'
    id: c-2026-11-13t04-56-00-375z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-13T04:56:00.720Z'
needsAction: null
baselineCommit: 9747783386088b67140c621fed5865bf72798b69
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/411'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/mechanics/covens.ts
    additions: 79
    deletions: 0
  - file: renderer/src/web/woke/mechanics/data.ts
    additions: 17
    deletions: 0
  - file: renderer/src/web/woke/mechanics/guide.ts
    additions: 6
    deletions: 0
  - file: renderer/src/web/woke/ui/game-icons.ts
    additions: 2
    deletions: 0
  - file: renderer/test/woke/economy.test.ts
    additions: 3
    deletions: 0
  - file: renderer/test/woke/mechanics-guide.test.ts
    additions: 15
    deletions: 0
---
> **TL;DR:** Ctrl+Space search → unique (Mageblood) → item menu Price sent the unique's name as the trade base type. Fixed by giving the virtual unique its base; PR #411.

Bug report from Guy (screenshots via coordinator). Cause: `createVirtualItem` uniques had no `uniqueBase`, so create-item-filters used the plain-item branch. Fix: `virtualUnique(info)` in item-menu-logic.ts, used by the item menu Price, search Live listings and lookup tabs.

PR: https://github.com/guybnd/woke-poe-trade/pull/411
