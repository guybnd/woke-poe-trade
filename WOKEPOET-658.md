---
id: WOKEPOET-658
title: 'Run tracker: remember more than the last map instance'
status: Todo
priority: Low
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-27T11:31:11.201Z'
    comment: Created ticket.
---
countNewMap (renderer/src/web/woke/shared/map-areas.ts:39-46) keeps only one lastMapInstance (areaId:seed), so map A → map B → back to A counts A twice. A log line with no seed also counts every re-entry.

Fix idea: keep a short list of recent instance keys.

Guy: may matter more for campaign runs, where you go back and forth between zones. No work for now.
