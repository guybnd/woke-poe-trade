---
id: WOKEPOET-163
title: 'Split pseudo totals into their mods, and a right-click menu on stat rows'
status: Grooming
priority: Medium
effort: M
assignee: unassigned
tags:
  - price-check
  - ui
  - mocks
  - woke
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-09T09:18:37.194Z'
    comment: Created ticket.
    id: a-2026-11-09t09-18-37-194z
  - type: comment
    user: Agent
    comment: >-
      Pick a split style: A (the chip opens the mods underneath, recommended), B
      (the mods replace the total) or C (right-click only). Also say which
      right-click actions to keep. Mocks:
      https://claude.ai/artifact/QXX8betDrvkdL9ZS93YZ2d
    date: '2026-11-09T09:18:39.963Z'
    id: c-2026-11-09t09-18-39-963z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-09T09:18:39.963Z'
    comment: >-
      Pick a split style: A (the chip opens the mods underneath, recommended), B
      (the mods replace the total) or C (right-click only). Also say which
      right-click actions to keep. Mocks:
      https://claude.ai/artifact/QXX8betDrvkdL9ZS93YZ2d
  - type: comment
    user: Agent
    comment: Guy picked A.
    date: '2026-11-09T10:07:25.425Z'
    id: c-2026-11-09t10-07-25-425z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-09T10:07:25.425Z'
    comment: Guy picked A.
  - type: activity
    user: Agent
    date: '2026-11-09T10:07:27.378Z'
    comment: >-
      Built option A plus all six menu actions: PR #279 (branch
      woke/pseudo-split). The review found 4 bugs, all fixed (d9e2ca94): preset
      switch left split rows, same-stat mods weren't summed, min presets ignored
      lower-is-better stats, and Exclude kept its range. Local checks all pass.
      Merge handed to the cloud thread. Guy was in game, so the dev build
      restart waits.
    id: a-2026-11-09t10-07-27-378z
swimlane: null
needsAction: null
---
> **TL;DR:** Guy wants to click a pseudo chip (e.g. "total Elemental Resistance, Pseudo ×2") to split it into its mods, mainly so each gets a swap ⇄, plus right-click actions on stat rows. Mocks: https://claude.ai/artifact/QXX8betDrvkdL9ZS93YZ2d

Options: A chip opens the mods underneath (recommended), B the mods replace the total, C right-click only. Right-click menu: Search only this, Exclude it, set the min (my roll / bottom of tier / clear), price as an element (swappable rows), split/fold back, copy mod text.

Follows WOKEPOET-162 (PR #277). Code: price-check/filters/FilterModifier.vue, create-stat-filters.ts (calculatedStatToFilter), woke/harvest-swap, woke/ui openMenu.
