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
  - type: comment
    user: Agent
    comment: >-
      Guy asked for a flip screen. Drawn as mock E: a Swaps tab in the Flips
      panel. Each row is a recipe (the swap mod plus companion mods), showing
      buy element, sell element, buy and sell prices, swap cost, Profit and
      Supply. Scans run on click, one search per recipe split by element, plus a
      "from your price checks" line. Recommendation: build it after D, since it
      reuses D's swap search.
    date: '2026-11-09T04:36:06.136Z'
    selfAttested: true
    id: c-2026-11-09t04-36-06-136z
  - type: comment
    user: Agent
    comment: >-
      Guy: the flip screen should only appear when the item has swappable mods.
      Mock E is now a "Flip ⇄" tab in the price check, showing each swap outcome
      with its sell price, cost and profit. The Flips-panel recipe table is kept
      as an optional later step.
    date: '2026-11-09T04:36:38.329Z'
    selfAttested: true
    id: c-2026-11-09t04-36-38-329z
  - type: comment
    user: Agent
    comment: >-
      Guy approved the direction ("looks good"). Gaps I raised: (1) mods that
      work together, e.g. Fire damage + Fire penetration, need joint pricing or
      a half-swapped warning; (2) two swappable mods = 9 combinations, show the
      best single swap and the best pair; (3) splitting by element only sees the
      fetched listings, so cap it at one extra fetch page; (4) catalyst quality
      swap on jewellery is a possible later family; (5) re-check 3.30 notes
      (Gwennen coin flip, ducats, lifeforce prices). Still open: D button layout
      (second line vs folded into the marker) and the default cost limit.
    date: '2026-11-09T04:37:52.498Z'
    selfAttested: true
    id: c-2026-11-09t04-37-52-498z
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
