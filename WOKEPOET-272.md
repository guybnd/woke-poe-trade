---
id: WOKEPOET-272
title: 'Campaign card: wrong level and XP penalty in towns'
status: Ready
priority: Medium
effort: XS
assignee: unassigned
tags:
  - campaign
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T02:50:28.965Z'
    comment: Created ticket.
    id: a-2026-11-14t02-50-28-965z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/431 is up. In town, the
      XP band now uses the next zone on the route. The review is clean and the
      checks pass. Waiting on the merge.
    date: '2026-11-14T02:54:45.074Z'
    completionComment: true
    id: c-2026-11-14t02-54-45-074z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-14T02:54:45.074Z'
needsAction: null
---
> **TL;DR:** In town, the card's XP band now compares against the next zone on the route, not the town's own logged level.

Towns log an area level far above their act's zones: Highgate 1_4_town is 40 while the Aqueduct is 33, and the Sarn Encampment is 33. So the card showed "Lv 33 −7 · 81% XP" in Highgate. The fix in branch woke/town-xp adds nextFightZone (route-parse.ts), the first non-town zone ahead on the route. The tooltip names that zone, and the band is hidden past the end of the route.
