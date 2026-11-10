---
id: WOKEPOET-185
title: >-
  UI 5: safe zones, so panels and popups never sit on globes, flasks, skills or
  minimap
status: Grooming
priority: Medium
effort: M
assignee: unassigned
tags:
  - ui
  - overlay-core
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-169
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:25.167Z'
    comment: Created as subtask of WOKEPOET-169.
---
Charter P2. The review found no safe-zone code: `panel-fit.ts` keeps panels on screen, but nothing stops one being dropped over the life and mana globes, flasks, skill bar, minimap or boss bar. Work the red zones out from the game's 16:9 layout (holds on ultrawide and 4K), snap dragged panels out of them, and place popups beside the cursor clear of them. Mock the snap behaviour first.
