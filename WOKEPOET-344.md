---
id: WOKEPOET-344
title: 'Loot filter: hide magic gear by item tier, keep rares'
status: Grooming
priority: Medium
effort: S
assignee: unassigned
tags:
  - loot-filter
  - mocks
  - '3.30'
  - ux
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-17T03:00:23.902Z'
    comment: Created ticket.
---
Guy asked how the filter tells high tier rares from high tier magics on gear, and how to hide the magics but keep rares.

Finding (his live filter, NeverSink 8.21.0a Very strict): every `gear->tiered` and `exoticbases` rule has `Rarity Normal Magic Rare`, so there is no split. Workaround today: My rules › Hide, Rarity == Magic, Item tier >= 2, Class = gear classes (sits above NeverSink). Clunky (25 classes, also hides magic exotic bases).

Fix proposal: a rarity switch on the Tiered gear group. Mocks: https://claude.ai/artifact/EW2VfJb3iVNViWBdAddezP — waiting on Guy's pick.
