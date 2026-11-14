---
id: WOKEPOET-271
title: 'Run timer: per-run zone and level timeline with review view'
status: Grooming
priority: None
effort: M
assignee: unassigned
tags:
  - campaign
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T02:49:25.550Z'
    comment: Created ticket.
---
Guy wants each campaign run to save a full timeline he can review afterwards.

Plan: record zone entries (areaId, name, run time), level-ups and deaths per run from Client.txt, in its own file per run under userData (woke-run-timeline/<id>.json), loaded only when viewed. Review view opens from Run timer > Past runs.

Mocks: https://claude.ai/artifact/QhBzT9EB4qPjFiNYsTGVJL (A zone log, B act strips, C versus, recommended). Pick saves to artifact db picks/current. Building C meanwhile.

Open: campaign step times, rebuilding old runs from Client.txt.
