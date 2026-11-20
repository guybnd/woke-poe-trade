---
id: WOKEPOET-405
title: Price check new 3.30 Exalted Orbs as currency; currency-aware new-item note
status: In Progress
priority: Medium
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T03:23:56.108Z'
    comment: Created ticket.
---
Guy's screenshot: Primordial Exalted Orb price check showed the new-item fallback ("Mod filters come with the next item data update") with 2 listings.

- Not in item data on master, and not in upstream data v26 (#657) either.
- Trade-site diff (`scripts/trade-data-patch.mjs check`) shows only two new 3.30 exchange items missing: Primordial Exalted Orb and Originator's Exalted Orb. Added both as ITEM with tradeTag (bulk exchange + poe.ninja + Ctrl+Space).
- New-item fallback note now depends on kind: currency/cards say bulk prices come with the next data update, gems say level/quality filters; only gear says mod filters.
- Also reported by check (not in this change): 6 new stats, 12 new ids, 3 rewordings.
