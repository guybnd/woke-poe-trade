---
id: WOKEPOET-270
title: 'PoB tree overlay: hand a finished tree over to the next one'
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - pob
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T02:29:38.530Z'
    comment: Created ticket.
    id: a-2026-11-14t02-29-38-530z
  - type: activity
    user: Agent
    date: '2026-11-14T02:33:59.310Z'
    comment: Updated implementation link.
    id: a-2026-11-14t02-33-59-310z
  - type: comment
    user: Agent
    comment: >-
      PR #430 merged as 7036ce47: a finished tree hands over to the next stage
      in auto mode.
    date: '2026-11-14T02:44:30.371Z'
    completionComment: true
    id: c-2026-11-14t02-44-30-371z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-14T02:44:30.371Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 7036ce47. In auto mode, Alt+T moves on to the next stage's tree
      once the drawn one is fully taken, and the counter names the tree. Not yet
      confirmed in game.
    completionComment: true
    date: '2026-11-14T02:44:35.608Z'
    id: c-2026-11-14t02-44-35-608z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-14T02:44:36.098Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/430'
needsAction: null
baselineCommit: 407ba7f1f2c478fed465d0b71f60be15ccdb1be0
swimlane: null
diffSummary:
  - file: testing/e2e/loot-filter.spec.ts
    additions: 1
    deletions: 1
---
Guy (2026-11-14): auto mode doesn't move to the next tree as he levels. Level 29, Act 3, Elemental Hit Slayer guide.

Cause: Alt+T draws the stage tree by title ("Level 24", 28 points), which is fully taken by about level 27, so it shows "Tree done" until 33. Gems, gear and the panel are picking correctly; the panel's Next section already shows Level 33's tree. The build's tree titles match its gem titles, plus an empty "Level 64" spec.

Fix (branch pob-auto-tree): following your level, a tree read as all taken hands over to the next stage that adds nodes (treeAfter in build-model.ts), and the count names the drawn tree. A set picked by hand stays put. Untested in game.
