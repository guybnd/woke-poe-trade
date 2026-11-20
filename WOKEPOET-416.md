---
id: WOKEPOET-416
title: 'Bestiary: family icons and family filter chips'
status: In Progress
priority: None
effort: S
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T12:13:37.130Z'
    comment: Created ticket.
    id: a-2026-11-20t12-13-37-130z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-20T12:13:38.659Z'
needsAction: null
---
> **TL;DR** Guy picked layout B for beast types (WOKEPOET-415) and asked for real game icons and clickable family headers that filter the list.

- Icons: game Bestiary UI family icons (Art/2DArt/UIImages/InGame/Bestiary/IconCat|Snake|Spider|Crab via poedb CDN), bundled at renderer/public/images/bestiary/*.png, 48px.
- Each row: family icon instead of the generic beast orb; group as the tag.
- Full panel: chip per family; clicking narrows the list to that family before the 12-row limit; click again shows all.
- Branch woke/beast-family, worktree E:\Git\woke\wt\beast-family.
