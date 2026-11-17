---
id: WOKEPOET-344
title: >-
  Loot filter: redesign gear rules around rank, kind, drop tier, rarity,
  decorators
status: Grooming
priority: Medium
effort: L
assignee: unassigned
tags:
  - loot-filter
  - mocks
  - '3.30'
  - ux
  - epic
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-17T03:00:23.902Z'
    comment: Created ticket.
    id: a-2026-11-17t03-00-23-902z
  - type: activity
    user: Agent
    date: '2026-11-17T03:01:21.216Z'
    comment: >-
      Answer and workaround posted to Guy; mocks A (group rarity chips,
      recommended) / B (per-row chips) / C (preset switch) at
      https://claude.ai/artifact/EW2VfJb3iVNViWBdAddezP, waiting on his pick.
    id: a-2026-11-17t03-01-21-216z
  - type: activity
    user: Agent
    date: '2026-11-17T03:13:17.037Z'
    comment: Updated title. Updated description. Changed effort to L. Updated tags.
    id: a-2026-11-17t03-13-17-037z
  - type: activity
    user: Agent
    date: '2026-11-17T03:13:18.126Z'
    comment: >-
      Scope widened by Guy to a full gear-rules redesign; model + A/B/C mocks
      posted, waiting on his pick.
    id: a-2026-11-17t03-13-18-126z
---
> **TL;DR:** One Gear view that shows what happens to every kind of gear drop (base rank × base kind × drop tier × rarity × decorators), instead of ~30 NeverSink groups where rarity is sometimes lumped. Waiting on Guy's pick of A/B/C.

Started as: how to hide high item-tier magics but keep rares. NeverSink 8.21 `gear->tiered`, `exoticbases`, crafting and strands rules all say `Rarity Normal Magic Rare`. Workaround today: My rules › Hide, Rarity == Magic, Item tier >= 2, gear classes. First mocks (rarity chips only): https://claude.ai/artifact/EW2VfJb3iVNViWBdAddezP.

Guy then asked to redesign the whole thing from the ground up. Model + mocks: https://claude.ai/artifact/WaexT98oH3tYUrJSLredR5
- Model: keep NeverSink's order as the engine; compute outcomes by running sample drops through the real filter (match.ts matchItem); edits write narrow slice rules above NeverSink, listed in a "Your slices" strip.
- A (recommended): outcome grid, two axes on screen (default drop tier × rarity, rank inside cells), kind + decorators as chips, paint cells.
- B: one Gear page of layers in priority order with rarity toggles / shows-from / look per layer; edits change NeverSink rules.
- C: base map (slot × defence kind) driven by a drop builder; good as A's cell detail.
Base kind needs base defences (assets/data BaseType.armour ar/ev/es/ward). Counts in mock C are illustrative.
