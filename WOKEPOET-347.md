---
id: WOKEPOET-347
title: 'Gear tab: per-slot lines (F2) and Alt+F rank moves'
status: In Progress
priority: Medium
effort: M
assignee: unassigned
tags:
  - loot-filter
  - '3.30'
  - ux
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-17T06:00:25.815Z'
    comment: Created ticket.
---
> **TL;DR:** Guy picked F2 from the Gear canvas (per-slot lines), and asked for the Alt+F card to show a base's Gear rank with easy up/down. Branch woke/gear-slots, on the dev build for him to try.

- F2: GearSettings.slots, plus perSlot() in applyGear, which emits a row's rules per slot group (with a Class line) before the row's own. UI: ▸ on each row opens body/armour/offhand/jewellery/weapon sub-rows (dim = following the row).
- Alt+F: GearRankStrip.vue in SampleCard. Shows the lane (R1/R2/R3/Unranked/Never) with ▲▼ and chips, plus the row's line for the item's rarity. The copy has no drop tier, so it can't show the item's own tier.
- F1 (ranks from prices) goes in the Prices tab, per Guy. Not built yet.
