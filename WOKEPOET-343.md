---
id: WOKEPOET-343
title: 'Price check: timeless jewel mods not recognized in 3.30'
status: In Progress
priority: High
effort: S
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-16T15:10:32.865Z'
    comment: Created ticket.
    id: a-2026-11-16t15-10-32-865z
  - type: activity
    user: Agent
    date: '2026-11-16T15:11:04.442Z'
    comment: Updated implementation link.
    id: a-2026-11-16t15-11-04-442z
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/560'
---
> **TL;DR** Every timeless jewel's seed + conqueror lines showed "Not recognized modifier" in price check. The stat index only held the advanced form ("…Asenath(Asenath-Nasima)"), which 3.30 copy text drops. Fix indexes the plain text too. Branch woke/timeless-jewel-mods.

Reported from a Brutal Restraint screenshot. Covers all 6 jewels (18 stats), with tests and a 3.30 fixture.
