---
id: WOKEPOET-177
title: 'Load a widget''s code on first use, so switched-off tools really don''t load'
status: Grooming
priority: Low
effort: M
assignee: unassigned
tags:
  - overlay-core
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-168
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:54.578Z'
    comment: Created as subtask of WOKEPOET-168.
---
Review finding C1. The README says a switched-off tool "doesn't load", but all 28 widgets are imported up front in `renderer/src/web/woke/index.ts`; the startup budget is 2,190 KB of JavaScript (`testing/perf/budgets.json`).

Do: keep each widget's `widget` spec in the registry and load the component with `defineAsyncComponent`; lower `bundle.startupJs` to the new number. Or, cheaper, reword the README line.
