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
  - type: activity
    user: Agent
    date: '2026-11-11T05:10:14.925Z'
    comment: >-
      Waits for launch. `mechanics/guide.ts` requires each "when" line to be
      checked against a real Client.txt (for example, whether Oshabi still
      speaks once Harvest moves into maps). The Thread price groups need
      poe.ninja's 3.30 category name. The Vials group empties by itself once
      nobody trades vials.
    id: a-2026-11-11t05-10-14-925z
  - type: activity
    user: Agent
    date: '2026-11-12T07:42:28.069Z'
    comment: >-
      Scope added 2026-11-12, handed over from WOKEPOET-91: the "Abyss and
      Allflame mechanics" gap in the mechanics guide, with no Abyss entry and a
      thin Allflame one. Write both for 3.30, not 3.29. Abyss now comes from
      Abyss Threads, and Merrick's Ducat works directly on Abyssal Jewels.
      Allflame Embers are now currency applied to maps (three new ones:
      Cloister, Divine, Multitude), and Catarina always drops Propagation,
      Kulemak or Ethereal.
    id: a-2026-11-12t07-42-28-069z
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
