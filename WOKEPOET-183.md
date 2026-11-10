---
id: WOKEPOET-183
title: 'UI 3: roll the game look out panel by panel'
status: Grooming
priority: Medium
effort: XL
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-169
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:18.850Z'
    comment: Created as subtask of WOKEPOET-169.
---
After UI 2. Apply the shared game-look components to all 28 widgets, the dock cards, menus, toasts and Settings. Group into a few pull requests by area (economy, mapping, campaign and lab, builds and trade, settings), each with before and after headless shots at 1080p and 4K in the four themes.

Per panel, also clear its charter leftovers so it is touched once: sizes under 11 px (dock badge, offer chip, `ModulePage.vue:111`, price table), the 4 grey classes in `new-item/NewItemSearch.vue`.
