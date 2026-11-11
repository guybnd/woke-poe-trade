---
id: WOKEPOET-156
title: G. Rewrite atlas strategies and mechanics guide for 3.30
status: Grooming
priority: Medium
effort: None
assignee: unassigned
tags:
  - docs
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-08T09:53:53.627Z'
    comment: Created ticket.
    id: a-2026-11-08t09-53-53-627z
  - type: activity
    user: Agent
    date: '2026-11-08T09:53:53.627Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-08t09-53-53-627z
  - type: activity
    user: Agent
    date: '2026-11-11T04:22:27.883Z'
    comment: Updated description.
    id: a-2026-11-11t04-22-27-883z
---
> TL;DR: rewrite the atlas strategies and mechanics guide text for 3.30. The tree data loads by itself, but our text and presets don't.

Atlas (`atlas/guide.ts`, `farming/*`):
- The tree is fully reworked: you start at the centre, with 150 points. Delve and Heist clusters are gone, scarab clusters are now Thread clusters, and six keystones are removed.
- League mechanics no longer spawn randomly in maps (Abyss, Bestiary, Betrayal, Breach, Blight, Expedition, Incursion, Legion, Ritual, Ultimatum); Threads apply them. Shaped Regions grant free Threads.
- Our map list changes: 31 maps are back on the Atlas and 31 have left it (lists in the patch notes).

Mechanics guide (`mechanics/data.ts`, `guide.ts`):
- **Harvest**: Sacred Flora in maps, no grove.
- **Incursion**: Atziri lives in the Temple; Cradle of Creation; Vials are dead; Royal Visage; Soul Cores.
- **Betrayal**: new safehouse rewards.
- **Expedition**: Gwennen's coin flip replaces her gamble.
- **Bestiary**: yellow beasts are no longer captured.
- **Heist**: the Whakano shop; markers are out of the core drop pool.
- **Delirium**: orbs reforge maps now.
- **Ritual**: vessels need Ritual Threads.
- **Allflame Embers and Divine Vessels**: now currency used on maps.
- **Mercenary Warrants**: open the Proving Grounds.
- **Mirage**: now core.
