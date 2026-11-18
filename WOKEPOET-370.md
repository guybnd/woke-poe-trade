---
id: WOKEPOET-370
title: 'Alt+F unique list + tier tooltip: mark drop-restricted uniques'
status: In Progress
priority: Medium
effort: None
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T07:37:17.317Z'
    comment: Created ticket.
---
Guy (2026-11-18): on the Alt+F "Can drop as" list (#549), chip uniques that can't drop from random monsters (boss-only, league mechanic, vendor recipe / div card, Vaal transform, drop-disabled), so it's easier to decide whether to show or hide the base. Same info in the base hover tooltip under "Items in this tier" in the tier editor.

Data: PoE wiki cargo `items` (is_drop_restricted, drop_enabled, drop_text, acquisition_tags, drop_monsters) generated into a bundled JSON by a script; uncertain entries flagged.

Flow: mocks (PoE 1 look) → Guy's pick; build the recommended option meanwhile; adversarial review + local checks; branch to coordinator. Ships after v1.330.10.
