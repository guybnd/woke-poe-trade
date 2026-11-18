---
id: WOKEPOET-391
title: 'Bug hunt team 1: price check poe.ninja lookups and fractured stat columns'
status: Done
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
    id: a-2026-11-18t15-29-48-199z
  - type: activity
    user: Agent
    date: '2026-11-18T15:37:03.985Z'
    comment: >-
      Follow-up asked by Guy: normal cluster jewels get a poe.ninja price.
      Branch woke/cluster-ninja-price (1f1c2daf), stacked on woke/pc-bughunt;
      reviewed, 4599 tests green; sent to merge.
    id: a-2026-11-18t15-37-03-985z
  - type: comment
    user: Agent
    comment: 'Merged: #631 (9 price check fixes) and #639 (normal cluster jewel prices).'
    date: '2026-11-18T16:16:51.338Z'
    completionComment: true
    id: c-2026-11-18t16-16-51-338z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-18T16:16:51.338Z'
  - type: comment
    user: Agent
    comment: >-
      Merged #631 (d0f799a9): 9 price check fixes from the bug hunt. Merged #639
      (27191399, https://github.com/guybnd/woke-poe-trade/pull/639): normal
      cluster jewels priced from poe.ninja. Open, low: a price window left open
      10+ min counts its own check as "your earlier check".
    completionComment: true
    date: '2026-11-18T16:16:52.984Z'
    id: c-2026-11-18t16-16-52-984z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T16:16:53.300Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/631'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/pob-builds/BuildDetail.vue
    additions: 4
    deletions: 4
  - file: renderer/src/web/woke/pob-builds/build-model.ts
    additions: 14
    deletions: 0
  - file: renderer/test/woke/pob-builds.test.ts
    additions: 39
    deletions: 1
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
