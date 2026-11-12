---
id: WOKEPOET-18
title: Make the chosen PoB loadout shared across every window
status: Done
priority: Medium
effort: M
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T03:42:51.336Z'
    comment: Created ticket.
    id: a-2026-11-05t03-42-51-336z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-05T03:44:23.371Z'
  - type: activity
    user: Agent
    date: '2026-11-05T03:49:41.904Z'
    comment: Updated implementation link.
    id: a-2026-11-05t03-49-41-904z
  - type: comment
    user: Agent
    comment: >-
      PR #92 is open on claude/shared-pob-loadout, worked in the separate clone
      E:\Git\woke-poe-trade-loadout. The pick is saved per build and read by the
      panel tabs, campaign and dock cards, price chip and filter rules. Unit
      tests and the pob-builds, campaign, price-check and loot-filter e2e specs
      pass. Not yet tried on Guy's live overlay.
    date: '2026-11-05T03:49:43.598Z'
    completionComment: true
    id: c-2026-11-05t03-49-43-598z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-05T03:49:43.598Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:16:50.537Z'
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/92'
reviewState: null
---
> **TL;DR:** Picking a skill or item set chip in the PoB panel only changed that one panel's view. Make the pick one saved choice per build that the panel tabs, campaign card, price chip and filter rules all read. The level-based pick stays the default until a set is picked by hand.

## Plan
- Save per-build picks on the PoB widget (`loadouts`, by set title).
- `build-model`: `loadoutOf` resolves skill set, item set and tree; a pick links same-named sets. Stage helpers take the pick.
- `useActiveBuild` exposes the active build's pick; campaign card, price chip and filter input pass it on.
- Build panel: chips save the pick; Links you need now, gems, Gear and Setups follow it; an Auto chip goes back to following your level.
- Tests in `renderer/test/woke`.
