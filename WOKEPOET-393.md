---
id: WOKEPOET-393
title: >-
  Price check mod menu extras: next tier up, all tiers, always/never tick,
  Alt+Click exclude
status: Grooming
priority: Medium
effort: M
assignee: Agent
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:39:45.779Z'
    comment: Created ticket.
---
Guy's extra picks from the mod menu mocks (https://claude.ai/artifact/A23iFZEDZdvc8MKFY6hVPt, picks/current, 2026-11-18), on top of #628.

Branch `woke/menu-tier-picks` (b7494886, on master 9e9f2ab0):
- Min: Next tier up (Tn, value) and All tiers… (second menu; a click sets min/max to that tier's worst roll), from public/data/mod-tiers.json; shown only when the data's tier matches the item's own
- Always tick this / Never tick this, saved in price-check config `wokeTickPrefs`, applied to new price checks (not bulk, not inTotal/hidden rows)
- Alt + Click a tick box = Exclude it
Review: 8 findings, 7 fixed (catalysed jewellery gets no tier lines, safe).
