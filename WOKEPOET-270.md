---
id: WOKEPOET-270
title: 'PoB tree overlay: hand a finished tree over to the next one'
status: In Progress
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
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/430'
---
Guy (2026-11-14): auto mode doesn't move to the next tree as he levels. Level 29, Act 3, Elemental Hit Slayer guide.

Cause: Alt+T draws the stage tree by title ("Level 24", 28 points), which is fully taken by about level 27, so it shows "Tree done" until 33. Gems, gear and the panel are picking correctly; the panel's Next section already shows Level 33's tree. The build's tree titles match its gem titles, plus an empty "Level 64" spec.

Fix (branch pob-auto-tree): following your level, a tree read as all taken hands over to the next stage that adds nodes (treeAfter in build-model.ts), and the count names the drawn tree. A set picked by hand stays put. Untested in game.
