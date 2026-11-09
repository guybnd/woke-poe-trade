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
