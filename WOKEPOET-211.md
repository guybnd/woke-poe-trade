---
id: WOKEPOET-211
title: 'Atlas strategies like PoB builds: tree editor, folders, Threads loadout'
status: Grooming
priority: None
effort: None
assignee: unassigned
tags:
  - '3.30'
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-12T04:20:21.369Z'
    comment: Created ticket.
    id: a-2026-11-12t04-20-21-369z
  - type: activity
    user: Agent
    date: '2026-11-12T04:20:21.369Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-12t04-20-21-369z
  - type: comment
    user: Agent
    comment: >-
      Pick a layout (A PoB twin, B tree first, C map device card), the Threads
      control, folders, and the hideout card on
      https://claude.ai/artifact/EVKCgRCYMZoaMdWmhyBdZC and press Save.
      Recommended: A, three slots, nested folders, loadout on the hideout card.
    date: '2026-11-12T04:20:26.536Z'
    id: c-2026-11-12t04-20-26-536z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-12T04:20:26.536Z'
    comment: >-
      Pick a layout (A PoB twin, B tree first, C map device card), the Threads
      control, folders, and the hideout card on
      https://claude.ai/artifact/EVKCgRCYMZoaMdWmhyBdZC and press Save.
      Recommended: A, three slots, nested folders, loadout on the hideout card.
swimlane: require-input
needsAction: null
---
> **TL;DR** Turn the Atlas strategies tool into a PoB-builds-style tool: atlas tree viewer and editor (3.30 tree from GGG's export, pick-a-type notables), strategies in folders, and per-strategy settings for Threads (count per type) and currency per map. Mocks first; waiting on Guy's pick.

Mocks with pick buttons: https://claude.ai/artifact/EVKCgRCYMZoaMdWmhyBdZC (picks land in its db at picks/current).

Today: woke/atlas/WidgetAtlas.vue has a flat strategy list, a tree link decoded into notables by mechanic, scarab costs, and a hideout dock card.

Facts from the 3.30 export (grindinggear/atlastree-export): 1117 nodes, 138 points, same layout format as the passive tree (groups, orbits, sprites), so pob-builds/tree-draw.ts can draw it. 31 notables are `isMultipleChoiceVariant` with `variantEffects` (pick a type, e.g. Dextral Threads: Breach/Ritual/Ultimatum/Expedition/Incursion). Ten thread types: Breach, Ritual, Ultimatum, Expedition, Incursion, Abyss, Bestiary, Blight, Betrayal, Legion. Unwavering Vision keystone: one thread type only, +2 past the 8 cap.
