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
  - type: comment
    user: Agent
    comment: >-
      Added Genteel's Ducat (3.29 Allflame) attribute swap to the page. It picks
      the new attribute at random, so it's shown as two outcomes with an
      average. It only works when the item has a single one-attribute mod, works
      on small clusters since 3.29.3, and it's unknown whether ducats stay in
      the game for 3.30.
    date: '2026-11-09T04:03:22.514Z'
    selfAttested: true
    id: c-2026-11-09t04-03-22-514z
  - type: comment
    user: Agent
    comment: >-
      Guy's direction is drawn as mock D: a ⇄ marker on each swappable mod with
      this / any / specific element buttons, an "All swaps" button, and a cost
      limit plus per-family toggles in settings. Max res on jewels is now marked
      swappable. Open questions: show the buttons as a second line, or folded
      into the marker? Default automatic cost limit (20c drawn)?
    date: '2026-11-09T04:35:09.029Z'
    selfAttested: true
    id: c-2026-11-09t04-35-09-029z
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
