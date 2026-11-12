---
id: WOKEPOET-169
title: >-
  Epic: game-look UI across the whole toolkit, modelled on the price check's PoE
  mode
status: Done
priority: High
effort: None
assignee: unassigned
tags:
  - ui
  - mocks
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-168
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:25.870Z'
    comment: Created ticket.
    id: a-2026-11-10t02-55-25-870z
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:25.870Z'
    comment: Created as subtask of WOKEPOET-168.
    id: a-2026-11-10t02-55-25-870z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T00:17:35.589Z'
subtasks:
  - WOKEPOET-181
  - WOKEPOET-182
  - WOKEPOET-183
  - WOKEPOET-184
  - WOKEPOET-185
  - WOKEPOET-186
needsAction: null
---
Guy (2026-11-10): take the latest price check rework (PoE mode, #290/#292) as the inspiration and adopt game-looking UI elements across the tool, aligned holistically, not panel by panel.

Source: review report https://claude.ai/artifact/Ag7Aow1vV4xmW9WwRvK96G (UI charter section). Charter: https://claude.ai/artifact/CB65QcY78n6ztJvbEbFK4j.

Mocks first, Guy picks before any code. The PoE mode kit lives in `renderer/src/web/woke/price-insight/poe-kit`, `poe-mode.css` and `window-style.ts`; today it is private to the price check.

Open question the mocks must answer: the charter (P5) says "no fake parchment, no bevels" and Fontin for titles only. PoE mode goes further toward the game's own look. The charter needs an edit to match whatever Guy picks.

Subtasks carry the work; the charter leftovers from the review ride along so each panel is touched once.
