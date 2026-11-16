---
id: WOKEPOET-342
title: 'Price check: tick base type by default on fractured items'
status: Done
priority: None
effort: XS
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-16T14:51:06.446Z'
    comment: Created ticket.
    id: a-2026-11-16t14-51-06-446z
  - type: activity
    user: Agent
    date: '2026-11-16T15:04:13.069Z'
    comment: >-
      PR #559 up (also covers Guy's overquality default: base + quality + ilvl,
      mods off). Checks green locally; handed to coordinator for merge.
    id: a-2026-11-16t15-04-13-069z
  - type: comment
    user: Agent
    comment: 'Merged as #559 (c88581d8); dev reloaded on master.'
    date: '2026-11-16T15:16:03.200Z'
    completionComment: true
    id: c-2026-11-16t15-16-03-200z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-16T15:16:03.200Z'
  - type: comment
    user: Agent
    comment: >-
      Fractured items start with base type ticked; overquality items start as
      base + quality + ilvl, mods off. Merged c88581d8, live in dev.
    completionComment: true
    date: '2026-11-16T15:16:07.623Z'
    id: c-2026-11-16t15-16-07-623z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-16T15:16:07.988Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/559'
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
Guy (2026-11-16): when the item is fractured, the base type filter should start ticked in price check. No extra trade searches.

Fix: `create-item-filters.ts` starts the category (relaxed) search disabled for fractured items. Branch `woke/frac-base-default`, worktree `E:\Git\woke\wt\frac-base`.
