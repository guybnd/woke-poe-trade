---
id: WOKEPOET-191
title: L. Loot filter content for 3.30
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-11T04:22:43.762Z'
    comment: Created ticket.
    id: a-2026-11-11t04-22-43-762z
  - type: activity
    user: Agent
    date: '2026-11-11T04:22:43.762Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-11t04-22-43-762z
  - type: activity
    user: Agent
    date: '2026-11-11T05:10:12.930Z'
    comment: >-
      Parked until NeverSink's 3.30 filter is out (last NeverSink commit: 8.20.2
      on 2026-10-15). Our groups (`economy.ts`) key on NeverSink's `$type->tier`
      sections, and the Thread section names and item classes aren't known yet.
      Pick this up when NeverSink pushes 3.30.
    id: a-2026-11-11t05-10-12-930z
  - type: activity
    user: Agent
    date: '2026-11-13T02:43:46.045Z'
    comment: >-
      Also needs a Wickerman trophy group: about 170 boss body-part items in
      Head, Torso, Upper Limb and Lower Limb slots, per poedb's Covens page.
      Threads stack to 100.
    id: a-2026-11-13t02-43-46-045z
  - type: activity
    user: Agent
    date: '2026-11-13T19:51:47.827Z'
    comment: >-
      NeverSink 8.21.0a (3.30) is out. PR #424 adds the new `Fated` condition to
      the validator. The real filter round-trips and validates clean, and uses
      `UnidentifiedItemTier >= 4/5`. Viscera have their own `$type->viscera`
      section with tiers t2/t3/t4; Threads sit in `$type->fragments`. Still to
      do: a Viscera economy group once poe.ninja has a category for them (no
      Covens data on poe.ninja yet at 19:45 UTC). The scarab group is now empty.
    id: a-2026-11-13t19-51-47-827z
  - type: activity
    user: Agent
    date: '2026-11-18T06:50:10.618Z'
    comment: >-
      Built on woke/filter-330-lists (10c47e5c, pushed, reviewed, checks pass):
      3.30 drop table + safety net + guard. Not done (no data source): min item
      tier per base beyond Stygian Vise, Wickerman/Viscera groups, Soul
      Core/Essence of Trickery drop areas. Divine Vessel stack size 20 and
      normal-Vise tier unverified.
    id: a-2026-11-18t06-50-10-618z
  - type: comment
    user: Agent
    comment: >-
      Merged as #610 (63637621): 3.30 items in the preview drop table, safety
      net and filter guard. Not done (no data source): per-base tier gates
      beyond Stygian Vise, Wickerman/Viscera groups.
    date: '2026-11-18T07:13:22.655Z'
    completionComment: true
    id: c-2026-11-18t07-13-22-655z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T07:13:22.655Z'
  - type: comment
    user: Agent
    comment: >-
      Merged #610: loot filter knows the 3.30 items (Threads, Frayed Thread,
      Royal Visage, new bases, tier-5 Stygian Vise) in the drop table, safety
      net and guard.
    completionComment: true
    date: '2026-11-18T07:13:27.305Z'
    id: c-2026-11-18t07-13-27-305z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T07:13:27.735Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/610'
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
> TL;DR: what our filter groups, drop table and safety net need for 3.30 items. Most of it lands through NeverSink's 3.30 filter; this ticket covers our own lists.

From the patch notes:
- **Threads** (10 kinds plus Frayed) need a group and a safety-net price type. The scarab group goes dead.
- **Base types gated by tier**: Stygian Vise needs tier 5, Steel Ring tier 3 or higher, and so on. Bases newly in the core pool from tier X: Astrolabe Amulet, Cogwork, Composite, Geodesic, Helical, Manifold and Ratcheting Rings, Cord Belt, Focused and Simplex Amulets, Stygian Vise. `drops.ts` drop levels and weights for these are now wrong.
- Allflame Embers, Divine Vessels and Mercenary Warrants are now currency used on maps, not fragments. Check their item class in `economy.ts` and `drops.ts`.
- Removed: Mortal and Sacrifice fragments, Vials, Orb of Binding drops, Mirage coins, and Heist markers and contracts from the core pool.
- New sellables: Royal Visage, Soul Cores, Essence of Trickery, Divine Vessel (now stacks to 20).
