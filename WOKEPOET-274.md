---
id: WOKEPOET-274
title: Move 3.30's moved trade stat ids onto our stats
status: In Progress
priority: High
effort: None
assignee: unassigned
tags:
  - data
  - price-check
  - '3.30'
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T03:07:23.120Z'
    comment: Created ticket.
---
The trade site moved granted skills and socketed supports to new ids (`explicit.effect_<n>`) with new words ("Grants Level 22 Anger", "...Added Fire Damage Support"), and dropped other ids. 365 ids in en/stats.ndjson were dead: price checks on those items failed ("Unknown stat provided") or left the mod unread.

Fix (branch woke/stat-id-remap): `remap()` in scripts/trade-data-patch.mjs moves dead ids to the new id with the same stat text, folds the duplicate stats the PR 423 run added, drops ids with no replacement; runs first in apply/check (so the hourly upstream job does it too) and alone as `remap` mode. Data: 247 moved, 66 duplicates folded, 118 dropped; data version 8.

Open: fractured granted skills/supports have no trade id at all now, so those mods read as unknown.
