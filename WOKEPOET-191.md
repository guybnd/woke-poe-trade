---
id: WOKEPOET-191
title: L. Loot filter content for 3.30
status: Grooming
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
---
> TL;DR: what our filter groups, drop table and safety net need for 3.30 items. Most of it lands through NeverSink's 3.30 filter; this ticket covers our own lists.

From the patch notes:
- **Threads** (10 kinds plus Frayed) need a group and a safety-net price type. The scarab group goes dead.
- **Base types gated by tier**: Stygian Vise needs tier 5, Steel Ring tier 3 or higher, and so on. Bases newly in the core pool from tier X: Astrolabe Amulet, Cogwork, Composite, Geodesic, Helical, Manifold and Ratcheting Rings, Cord Belt, Focused and Simplex Amulets, Stygian Vise. `drops.ts` drop levels and weights for these are now wrong.
- Allflame Embers, Divine Vessels and Mercenary Warrants are now currency used on maps, not fragments. Check their item class in `economy.ts` and `drops.ts`.
- Removed: Mortal and Sacrifice fragments, Vials, Orb of Binding drops, Mirage coins, and Heist markers and contracts from the core pool.
- New sellables: Royal Visage, Soul Cores, Essence of Trickery, Divine Vessel (now stacks to 20).
