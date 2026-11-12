---
id: WOKEPOET-125
title: Three-way Corrupted chip in price check
status: Done
priority: Medium
effort: S
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-06T03:20:38.700Z'
    comment: Created ticket.
    id: a-2026-11-06t03-20-38-700z
  - type: activity
    user: Agent
    date: '2026-11-06T03:33:59.153Z'
    comment: Updated implementation link.
    id: a-2026-11-06t03-33-59-153z
  - type: activity
    user: Agent
    date: '2026-11-06T03:34:00.138Z'
    comment: >-
      PR #214 up, clone E:\Git\woke-corrupted-chip. Review finding fixed
      (poe.ninja fit follows the chip). Local checks pass; CI running; merge
      requested from the coordinator once green.
    id: a-2026-11-06t03-34-00-138z
  - type: comment
    user: Agent
    comment: >-
      Merged as c9a5f89 (#214) and running on the dev build. Chip cycles Any,
      Corrupted, Uncorrupted at one width; poe.ninja's fit follows it. Not yet
      clicked in the real game.
    date: '2026-11-06T03:41:05.336Z'
    completionComment: true
    id: c-2026-11-06t03-41-05-336z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-06T03:41:05.336Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:17:16.267Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/214'
needsAction: null
reviewState: null
---
Guy asked which chip setting searches both corrupted and not corrupted, then approved a three-way chip, with "make sure the chip stays not too big".

Today: value true and not exact sends no filter (both), but is labelled Corrupted. Corrupted-only is impossible except on magic jewels.

Change: click cycles Any / Corrupted / Not Corrupted. Openers: uncorrupted item on Not Corrupted, magic jewel on Corrupted, corrupted item on Any (same search as today).
