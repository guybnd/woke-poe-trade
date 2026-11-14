---
id: WOKEPOET-280
title: 'Tree overlay: show ascendancy points and nodes'
status: Grooming
priority: Medium
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T04:47:33.611Z'
    comment: Created ticket.
---
Guy wants the passive tree view (Alt+T over the game's tree, auto mode following level) to show ascendancy points/nodes too, not just the main tree.

Today: TreeOverlay.vue draws only main-tree nodes; tree data (build-tree-data.mjs) stores asc nodes at 0,0 with no links or icons, notables named only.

Plan: mockups with 2–3 options first (thread "Show ascendancy points in tree passives"), then build the pick. Coordinate with the auto-mode thread (CampaignBuild/active.ts). Branch woke/tree-ascendancy, worktree E:\Git\woke-tree-asc.
