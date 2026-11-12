---
id: WOKEPOET-214
title: 'Atlas tree overlay: draw the active atlas strategy over the in-game atlas tree'
status: Grooming
priority: None
effort: M
assignee: unassigned
tags:
  - feature
  - '3.30'
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-12T10:13:11.824Z'
    comment: Created ticket.
    id: a-2026-11-12t10-13-11-824z
  - type: comment
    user: Agent
    comment: >-
      Two picks for Guy: 1) Same Alt+T for both trees (detects which is on
      screen), or a separate atlas key? 2) Should the atlas dock icon click,
      card and menu also draw it, like PoB's? The fit thresholds need real 3.30
      atlas screenshots, so final tuning happens on launch day.
    date: '2026-11-12T10:13:22.345Z'
    id: c-2026-11-12t10-13-22-345z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-12T10:13:22.345Z'
    comment: >-
      Two picks for Guy: 1) Same Alt+T for both trees (detects which is on
      screen), or a separate atlas key? 2) Should the atlas dock icon click,
      card and menu also draw it, like PoB's? The fit thresholds need real 3.30
      atlas screenshots, so final tuning happens on launch day.
swimlane: require-input
needsAction: null
---
Guy's ask (2026-11-12): the passive tree overlay (branch claude/project-thread-ttahrs: Alt+T, dock icon click, card/menu button, P-key tip) should work on the atlas tree too. He can only test it once 3.30 is out (13 Nov).

Reuse:
- main/src/woke/tree-fit.ts: finds the tree on screen by matching node points; needs the atlas node points and radii, plus atlas zoom steps.
- main/src/woke/tree-drag.ts and tree-overlay.ts: drag follow, edge learning, settle refits.
- Atlas node data and art are already in the repo from GGG's 3.30 export (PR #372). The active strategy comes from the atlas strategies module (PR #355).

Open questions:
- Hotkey: the same Alt+T, picking passive or atlas by whichever tree is on screen (try both fits), or a separate key?
- Entry points: the atlas dock icon click, card and menu, matching the PoB ones?
- The tree-fit thresholds (dark share, hits) were tuned on passive tree screenshots. They need real 3.30 atlas screenshots (zoomed in and out) as fixtures, like testing/vision/screens/passive-tree-real-*.png.

Plan: build the fit and drawing against the data now; capture fixtures and tune on launch day.
