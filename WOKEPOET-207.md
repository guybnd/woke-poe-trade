---
id: WOKEPOET-207
title: 'Pins for PoB build and dock cards, smaller text, see-through pins'
status: Ready
priority: None
effort: None
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-12T00:44:44.693Z'
    comment: Created ticket.
    id: a-2026-11-12t00-44-44-693z
  - type: comment
    user: Agent
    comment: >-
      Pick an option per question on
      https://claude.ai/artifact/QUBtX3QL74E3mUT4BWvPGv (PoB pin, card pin,
      smaller text, see-through pins), and say what "hideout repo" means there.
    date: '2026-11-12T00:44:49.985Z'
    id: c-2026-11-12t00-44-49-985z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-12T00:44:49.985Z'
    comment: >-
      Pick an option per question on
      https://claude.ai/artifact/QUBtX3QL74E3mUT4BWvPGv (PoB pin, card pin,
      smaller text, see-through pins), and say what "hideout repo" means there.
  - type: activity
    user: Agent
    date: '2026-11-12T00:53:13.707Z'
    comment: Updated description.
    id: a-2026-11-12t00-53-13-707z
  - type: comment
    user: Agent
    comment: Guy picked; building.
    date: '2026-11-12T00:53:13.777Z'
    id: c-2026-11-12t00-53-13-777z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-12T00:53:13.777Z'
    comment: Guy picked; building.
  - type: activity
    user: Agent
    date: '2026-11-12T01:13:05.221Z'
    comment: >-
      Built on woke/pins (clone E:\Git\woke-pins): PR
      https://github.com/guybnd/woke-poe-trade/pull/338. Reviewed adversarially,
      with fixes in d926ea0f. Local checks pass. Merge requested through the
      cloud route. Dev build waits on the essence thread, then goes to master.
      Known limit: cards that mark alerts seen on open (market, essence) only do
      it once while pinned.
    id: a-2026-11-12t01-13-05-221z
  - type: comment
    user: Agent
    comment: >-
      Merged as 73b41410 (PR #338) and live on the dev build (master). Pins for
      every dock card (they detach and drag), plus PoB tree, gear slot, gem
      chain and next step. Each pin has its own see-through level and a separate
      spot in hideout/town vs elsewhere. Text goes down to 70%, with a Pinned
      size slider. Waiting on Guy's in-game try.
    date: '2026-11-12T01:36:49.137Z'
    completionComment: true
    id: c-2026-11-12t01-36-49-137z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-12T01:36:49.137Z'
swimlane: null
needsAction: null
---
Player feedback (Jacket, Discord): pin PoB build while buying/allocating, pin dock cards in maps, smaller text, see-through pinned tree, "hideout repo".

Guy's picks (2026-11-12, https://claude.ai/artifact/QUBtX3QL74E3mUT4BWvPGv db picks/current):
- PoB: C (pin single pieces: tree, gear slot, gem chain), plus B (short to-do card: shopping list + next points) as its own pin.
- Cards: A (pin button on every card), and pinned cards detach from the dock and move freely.
- Text: B (Text size floor 70% + separate size for pinned things).
- Opacity: C (per-pin opacity, wheel over ◐; solid on hover).
- Hideout repo: "reposition" = pinned things keep a separate spot in hideout vs maps.

Plan: one shared pin layer (floating, draggable, per-pin opacity/size, per-area position) → cards → PoB pieces.

Today (master 337d5118): PoB panel invisible-on-blur; only campaign/lab cards pinnable (click pin ends on overlay close); text 100–150%; Panel opacity fades backgrounds only.
