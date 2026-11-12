---
id: WOKEPOET-214
title: 'Atlas tree overlay: draw the active atlas strategy over the in-game atlas tree'
status: Todo
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
  - type: activity
    user: Agent
    date: '2026-11-12T10:55:39.208Z'
    comment: Updated description.
    id: a-2026-11-12t10-55-39-208z
  - type: comment
    user: Agent
    comment: >-
      Guy picked: the same Alt+T (it detects which tree is open), and the atlas
      dock icon gets the same click, card button and menu row as PoB.
    date: '2026-11-12T10:55:40.303Z'
    id: c-2026-11-12t10-55-40-303z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-12T10:55:40.304Z'
    comment: >-
      Guy picked: the same Alt+T (it detects which tree is open), and the atlas
      dock icon gets the same click, card button and menu row as PoB.
  - type: activity
    user: Agent
    date: '2026-11-12T10:55:53.863Z'
    comment: Updated description.
    id: a-2026-11-12t10-55-53-863z
  - type: comment
    user: Agent
    comment: >-
      Picks recorded, build notes and acceptance criteria in the body. It's for
      the 3.30 launch and needs Guy's 3 atlas screenshots (zoomed out, mid, in)
      at 1440p before the fit can be tuned.
    date: '2026-11-12T10:55:56.262Z'
    id: c-2026-11-12t10-55-56-262z
  - type: status_change
    from: Grooming
    to: Todo
    user: Agent
    date: '2026-11-12T10:55:56.263Z'
swimlane: null
needsAction: null
---
> **TL;DR** Make Alt+T (and the atlas dock icon's click, card button and menu row) draw the active atlas strategy over the in-game atlas tree, reusing the passive tree overlay from #391. For 3.30 launch; needs Guy's real atlas screenshots to tune the fit.

Guy's ask (2026-11-12): the passive tree overlay (merged as #391: Alt+T, dock icon click, card/menu button, P-key tip) should work on the atlas tree too. He can only test it once 3.30 is out (13 Nov).

## Guy's picks (2026-11-12)
1. The same hotkey: Alt+T works out which tree is open.
2. The atlas dock icon gets the same click, card button and menu row as the PoB icon.

## Build notes
- Fit: reuse main/src/woke/tree-fit.ts. It needs the atlas node points and radii, plus atlas zoom steps and masks measured from real 3.30 atlas screenshots at 1440p. Ask Guy for 3 shots: fully zoomed out, mid and fully in. Add them as fixtures like testing/fixtures/screens/passive-tree-real-*.
- Main: reuse main/src/woke/tree-overlay.ts and tree-drag.ts for drag follow, edge learning and settle refits. On Alt+T, try the passive fit, then the atlas fit; the dark gate and the score decide which tree is open.
- Renderer: generalise pob-builds/TreeOverlay.vue and tree-toggle.ts to a tree kind (passive or atlas). The atlas data and drawing rules are in renderer atlas/atlas-tree.ts and tree.ts (GGG's 3.30 export, PR #372). The active strategy comes from the atlas strategies module (PR #355, widget.ts / strategies.ts).
- Entry points: atlas dock icon (WidgetAtlas.vue) gameClick, plus a card button and a menu row, mirroring WidgetPobBuilds.vue and BuildHoverCard.vue. It falls back to opening the window when no tree is on screen.
- Screenshots stay in memory only, as in #391.

## Acceptance criteria
- [ ] With the atlas tree open, Alt+T draws the active strategy's untaken nodes and lines over it; pressing it again hides them.
- [ ] With the passive tree open, Alt+T still draws the PoB build (no regression).
- [ ] The atlas dock icon click draws (or opens the window when no tree is on screen); the card button and menu row draw or hide it.
- [ ] Fits within about 2 px on Guy's 3 real 1440p atlas shots (fixtures and tests added); play screens are rejected.
- [ ] Drag follow and edge stop work on the atlas tree.
