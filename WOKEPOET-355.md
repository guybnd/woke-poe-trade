---
id: WOKEPOET-355
title: One item name reader for league variants
status: In Progress
priority: None
effort: S
assignee: unassigned
tags:
  - cleanup
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-354
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:43:55.404Z'
    comment: Created ticket.
    id: a-2026-11-17t09-43-55-404z
  - type: activity
    user: Agent
    date: '2026-11-17T09:43:55.404Z'
    comment: Created as subtask of WOKEPOET-354.
    id: a-2026-11-17t09-43-55-404z
  - type: status_change
    from: Backlog
    to: In Progress
    user: Agent
    date: '2026-11-17T09:47:44.438Z'
needsAction: null
---
> **TL;DR:** Foulborn, transfigured and Fated names are stripped by hand in about ten files. One shared reader tells every tool the plain name and the variant.

Audit finding 4. Add `readItemName(name) -> { plain, variant }` and use it in search, item menu, tooltip text, game icons, disenchant, loot filter drop uniques, PoB unique prices. Check whether "no price check for Foulborn" in the item menu is on purpose before touching it.
