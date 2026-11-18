---
id: WOKEPOET-391
title: 'Bug hunt team 1: price check poe.ninja lookups and fractured stat columns'
status: In Progress
priority: High
effort: None
assignee: unassigned
tags:
  - bug
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:29:48.199Z'
    comment: Created ticket.
---
Bug hunt (team 1 of 3). Branch `woke/pc-bughunt` (2fafb2c2), sent to merge.

Fixed:
1. Imbued gems showed the plain gem's poe.ninja price (10c vs thousands): now none.
2. 3.30 maps never matched poe.ninja ("Map (Tier 16)", "T0, Gen-24").
3. Maxed Awakened Empower/Enlighten/Enhance looked up level 1 or nothing.
4. Fractured rares: stat columns tinted every listing higher (yours missed fracShare).
5. Wombgifts: no price (ilvl bands 40/68/75/84).
6. Double-influence bases: no price ("Shaper/Crusader" order).
7. Unfit poe.ninja price with no listings labelled as the item's average.
8. Unique tinctures: no price (variant "Tincture").
9. Vessel of Vinktar, Yriel's Fostering: no price (no longer split by mod).

Not fixed (low): a price window open 10+ min counts its own check as "your earlier check".

Checks: vue-tsc, eslint, vitest 4596 green; adversarial review done, its regression fixed.
