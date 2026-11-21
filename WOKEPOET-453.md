---
id: WOKEPOET-453
title: 'Gate: every line item has the item hover tooltip'
status: In Progress
priority: High
effort: None
assignee: unassigned
tags:
  - testing
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T11:21:47.559Z'
    comment: Created ticket.
---
Guy's standing rule: every row that names an item, mod, sale or listing has a proper hover tooltip (the standard item hover for items). Build an automated gate so it can't slip: e2e audit in the fake-game harness (testing/e2e/tip-audit.ts), v-item-tip marks its element, fix real gaps, document in CLAUDE.md / ui README.
