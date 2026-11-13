---
id: WOKEPOET-262
title: 'Price from search fails on uniques: Unknown item base type'
status: In Progress
priority: High
effort: XS
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-13T04:46:41.534Z'
    comment: Created ticket.
---
> **TL;DR:** Ctrl+Space search → unique (Mageblood) → item menu Price sent the unique's name as the trade base type. Fixed by giving the virtual unique its base; PR #411.

Bug report from Guy (screenshots via coordinator). Cause: `createVirtualItem` uniques had no `uniqueBase`, so create-item-filters used the plain-item branch. Fix: `virtualUnique(info)` in item-menu-logic.ts, used by the item menu Price, search Live listings and lookup tabs.

PR: https://github.com/guybnd/woke-poe-trade/pull/411
