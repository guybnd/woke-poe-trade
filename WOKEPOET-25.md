---
id: WOKEPOET-25
title: Redesign the price check window UI
status: Done
priority: Medium
effort: M
assignee: Agent
tags:
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T04:06:49.455Z'
    comment: Created ticket.
    id: a-2026-11-05t04-06-49-455z
  - type: activity
    user: Agent
    date: '2026-11-05T04:59:46.780Z'
    comment: >-
      PR #101 reviewed, findings fixed, local checks pass on 099f51ad
      (typecheck, lint, 264 unit tests, build, price-check e2e). gh pr merge
      from this PC was refused, so the cloud merge step was requested. The dev
      build is still to do, after the merge and when PoE isn't in front.
    id: a-2026-11-05t04-59-46-780z
  - type: activity
    user: Agent
    date: '2026-11-05T05:11:48.419Z'
    comment: Updated implementation link.
    id: a-2026-11-05t05-11-48-419z
  - type: comment
    user: Agent
    comment: >-
      First redesign merged as PR #101, then rebuilt on Guy's picked mock in PR
      #118.
    date: '2026-11-05T06:55:41.215Z'
    completionComment: true
    id: c-2026-11-05t06-55-41-215z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-05T06:55:41.215Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:16:51.138Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/101'
needsAction: null
reviewState: null
---
> **TL;DR:** Overhaul the price check window's look: compact verdict at top, cleaner toolbar (Classic/Improved no longer clipped), tighter listings table with same-price grouping and stale de-emphasis, consistent fonts and spacing, PoE-flavored. All functions kept. WOKEPOET-22 owns moving/resizing the window, so this stays out of PriceCheckWindow's positioning.

Worked in the clone E:\Git\woke-poe-trade-pricecheck on `claude/price-check-redesign`.
