---
id: WOKEPOET-723
title: 'Loot filter: setting changes take seconds to apply'
status: In Progress
priority: High
effort: S
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-28T10:11:48.050Z'
    comment: Created ticket.
    id: a-2026-11-28t10-11-48-050z
  - type: activity
    user: Agent
    date: '2026-11-28T10:12:41.349Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/1095 opened; adversarial
      review clean; waiting for CI.
    id: a-2026-11-28t10-12-41-349z
---
> **TL;DR:** Every loot filter setting change rebuilt the whole filter in 2.3–4.1 s on the live overlay. Fixed hot spots in the rebuild (price lookups, gem band rescue, levelling floors, edits' block search); now 0.55–0.7 s.

Branch `woke/loot-filter-speed`. Profiled over CDP on the dev overlay (toggle 6 sockets preset on/off).
