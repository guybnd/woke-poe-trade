---
id: WOKEPOET-284
title: 'Price check: a unique priced by name gets its mods as stat rows'
status: In Progress
priority: Medium
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T05:25:15.873Z'
    comment: Created ticket.
---
Guy: "why cant i get any of the stats to filter when i price check from a searched item". A unique priced from Ctrl+Space search or the item menu had no game text, so it had no stat rows to filter on.

Change: build Ctrl+Alt+C-style game text from tips/uniques.json, with each range at its low end, and read it with the real parser. Rows start unticked, so the first search stays name-only. English only. A variant comes from the price row when it's known; otherwise only the mods every variant shares are used. Mod pools (more than 4 implicits or more than 12 explicits) and unreadable lines are left out. 1110 of 1194 known uniques get rows. Branch woke/search-unique-stats.
