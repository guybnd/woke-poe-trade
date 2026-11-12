---
id: WOKEPOET-211
title: 'Atlas strategies like PoB builds: tree editor, folders, Threads loadout'
status: Done
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
  - type: comment
    user: Agent
    comment: >-
      Guy picked A, three Thread slots, nested folders, loadout on the hideout
      card, regex folders synced for strategies and PoB builds (picks/current,
      2026-11-12 04:28 UTC). Import box added per his comment.
    date: '2026-11-12T04:28:39.585Z'
    id: c-2026-11-12t04-28-39-585z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-12T04:28:39.585Z'
    comment: >-
      Guy picked A, three Thread slots, nested folders, loadout on the hideout
      card, regex folders synced for strategies and PoB builds (picks/current,
      2026-11-12 04:28 UTC). Import box added per his comment.
  - type: activity
    user: Agent
    date: '2026-11-12T05:14:51.795Z'
    comment: >-
      PR #355 (branch woke/atlas-strategies, clone E:\Git\woke-atlas) reviewed,
      fixed, and sent for merge. Dev build switch waits on the Net worth preview
      (#354).
    id: a-2026-11-12t05-14-51-795z
  - type: comment
    user: Agent
    comment: 'Merged as #355 (4cf5d0ff) and live on the dev build (master).'
    date: '2026-11-12T05:24:06.322Z'
    completionComment: true
    id: c-2026-11-12t05-24-06-322z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T05:24:06.322Z'
swimlane: null
needsAction: null
---
> **TL;DR** Turn the Atlas strategies tool into a PoB-builds-style tool: atlas tree viewer and editor (3.30 tree from GGG's export, pick-a-type notables), strategies in folders, and per-strategy settings for Threads (count per type) and currency per map. Mocks first; waiting on Guy's pick.

Mocks with pick buttons: https://claude.ai/artifact/EVKCgRCYMZoaMdWmhyBdZC (picks land in its db at picks/current).

Today: woke/atlas/WidgetAtlas.vue has a flat strategy list, a tree link decoded into notables by mechanic, scarab costs, and a hideout dock card.

Facts from the 3.30 export (grindinggear/atlastree-export): 1117 nodes, 138 points, same layout format as the passive tree (groups, orbits, sprites), so pob-builds/tree-draw.ts can draw it. 31 notables are `isMultipleChoiceVariant` with `variantEffects` (pick a type, e.g. Dextral Threads: Breach/Ritual/Ultimatum/Expedition/Incursion). Ten thread types: Breach, Ritual, Ultimatum, Expedition, Incursion, Abyss, Bestiary, Blight, Betrayal, Legion. Unwavering Vision keystone: one thread type only, +2 past the 8 cap.
