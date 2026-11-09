---
id: WOKEPOET-162
title: Price items on their best Harvest resistance/damage swap
status: Grooming
priority: Medium
effort: M
assignee: unassigned
tags:
  - price-check
  - feature
  - mocks
  - woke
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-09T03:59:42.975Z'
    comment: Created ticket.
    id: a-2026-11-09t03-59-42-975z
  - type: comment
    user: Agent
    comment: >-
      Analysis + mocks: https://claude.ai/artifact/D7DMizEXjN1432Ckujv5Zz

      Pick a layout: A (element chip on the mod row), B (best-swap line under
      the price, recommended), or C ("any element" filter + element column).
      Also: show resistance swaps only when a single element is ticked (they
      don't change total-res pricing)? Needs two in-game checks: does the damage
      swap hit +1 Fire Spell gems, and what happens to two-element res mods.
    date: '2026-11-09T04:01:53.579Z'
    id: c-2026-11-09t04-01-53-579z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-09T04:01:53.579Z'
    comment: >-
      Analysis + mocks: https://claude.ai/artifact/D7DMizEXjN1432Ckujv5Zz

      Pick a layout: A (element chip on the mod row), B (best-swap line under
      the price, recommended), or C ("any element" filter + element column).
      Also: show resistance swaps only when a single element is ticked (they
      don't change total-res pricing)? Needs two in-game checks: does the damage
      swap hit +1 Fire Spell gems, and what happens to two-element res mods.
swimlane: require-input
needsAction: null
---
> **TL;DR:** Price check should also consider what an item is worth after a Harvest swap (Fire/Cold/Lightning resistance or elemental damage), and show the swap cost in lifeforce. Design pass first: analysis + mocks for Guy to pick.

## Facts (poedb Horticrafting, checked 2026-11-09)
- Only two mod-swap families exist: **resistance** and **elemental damage**, each Fire<->Cold<->Lightning, "similar-tier", 500 lifeforce. To Fire = Wild, to Cold = Vivid, to Lightning = Primal.
- Physical / Attack / Caster / etc are **reforge-with-tag** crafts (random), not swaps. Not priceable as a swap.
- 3.30 (13 Nov): Sacred Grove replaced by roots in maps; craft list itself not announced as changed. Re-check patch notes.

## Code hooks
- `appendAndFilter` in `trade/pathofexile-trade.ts` already turns a multi-tradeId stat into a `count >= 1` group: a swap filter = same roll, tradeIds of all three elements.
- Advanced copy gives tier + tags per mod (`parser/advanced-mod-desc.ts`) so we know fractured/crafted/tier.
- Lifeforce prices already fetched in `woke/mechanics/data.ts`.

Artifact with options: see history.
