---
id: WOKEPOET-184
title: 'UI 4: game art in place of generic icons'
status: Grooming
priority: Medium
effort: M
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-169
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:22.121Z'
    comment: Created as subtask of WOKEPOET-169.
---
Charter P18. 159 different Font Awesome icons, 655 uses in `woke/`. Where the game has art, use it through `WIcon` / `game-icons.ts`: coins (14 uses), skull (8), gem (6), stopwatch (5), hammer (5), dungeon (5), map (3), flask (2). Keep Font Awesome only for UI actions (close, copy, search, settings, pin). Module icons in `modules.ts` without game art: Investments, Lab gems, Wealthy Exile, Session analytics, Death recap, Run timer, Challenge guide. Short mock of the swaps for Guy first.
