---
id: WOKEPOET-129
title: 'PoB: set picker misreads titles; builds go stale after saving in PoB'
status: Done
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
    date: '2026-11-06T04:37:01.447Z'
    comment: Created ticket.
    id: a-2026-11-06t04-37-01-447z
  - type: activity
    user: Agent
    date: '2026-11-06T04:51:45.059Z'
    comment: >-
      PR #218 reviewed against all 45 real builds, review findings fixed, local
      checks pass. Merge requested through the coordinator. Branch
      pob-picker-fixes, clone E:\Git\woke-pob.
    id: a-2026-11-06t04-51-45-059z
  - type: comment
    user: Agent
    comment: >-
      Closed by commit `e53df7ac` on `master` — commit message carries `Closes:
      WOKEPOET-129`.
    date: '2026-11-08T09:55:04.102Z'
    idempotencyKey: 'commit-close:e53df7acf522111b3d57a8a6b7a4cbf57a1cb2d6:WOKEPOET-129'
    id: c-2026-11-08t09-55-04-102z
  - type: status_change
    from: In Progress
    to: Done
    user: Agent
    date: '2026-11-08T09:55:04.102Z'
needsAction: null
swimlane: null
implementationLink: e53df7acf522111b3d57a8a6b7a4cbf57a1cb2d6
---
> Colour codes show on set names and break level matching, `{3}` and `2 Stone` read as levels, Endgame loses to Level 80, divider sets count as stages, and a PoB save isn't picked up until reselecting. Clone E:\Git\woke-pob.
