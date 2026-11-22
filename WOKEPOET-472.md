---
id: WOKEPOET-472
title: 'Ctrl+Space: "Forbidden Reliquary" finds nothing'
status: In Progress
priority: Medium
effort: XS
assignee: unassigned
tags:
  - search
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-22T06:28:09.690Z'
    comment: Created ticket.
---
Guy searched "forbidden re" in Ctrl+Space while hovering a vault display case; only web fallbacks came back.

Cause: "Forbidden Reliquary" is the in-game label of the vault display case (poewiki Templar Vault pages), not an item. The item it held (A Stone Perfected, div card) is in item data and priced (16.58c Covens). The vault lookup only matched "vault" or vault names.

Fix: "forbidden reliquary"/"reliquary" (6+ letters) opens the Templar Vaults card, with a line saying to search the item on the label.
