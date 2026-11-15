---
id: WOKEPOET-313
title: 'Price check: listing tooltip missing on Viscera results'
status: In Progress
priority: Medium
effort: XS
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:52:28.272Z'
    comment: Created ticket.
    id: a-2026-11-15t05-52-28-272z
  - type: activity
    user: Agent
    date: '2026-11-15T05:52:38.731Z'
    comment: >-
      Fix + unit test committed locally on woke/viscera-listing-tip; local
      checks (lint, typecheck, unit, build, listing e2e, perf) running.
    id: a-2026-11-15t05-52-38-731z
---
Hovering trade result rows for a 3.30 Viscera (e.g. Ancestor's Club, Upper Limb) showed no listing tooltip.

Cause: the trade API sends Viscera with `frameType: 15` ("Viscera", rarity "Normal"). `listingTipItem` (woke/price-insight/listing-tip.ts) only knew frame types 0-3 and 9, so it returned null and the row drew no tooltip.

Fix: fall back to the listing's `rarity` string for frame types that aren't rarities, except gem/currency/card/quest/prophecy frames (4-8), which keep no tooltip. Test from a real Covens listing. Branch `woke/viscera-listing-tip` (worktree E:\Git\woke-viscera-tip).
