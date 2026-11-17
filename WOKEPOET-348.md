---
id: WOKEPOET-348
title: 'Atlas strategies: import a strategy from atlas tree screenshots'
status: Ready
priority: Medium
effort: None
assignee: unassigned
tags:
  - atlas
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-17T06:08:17.455Z'
    comment: Created ticket.
    id: a-2026-11-17t06-08-17-455z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-17T06:08:19.618Z'
  - type: activity
    user: Agent
    date: '2026-11-17T06:10:17.219Z'
    comment: >-
      Mocks A/B/C with Pick buttons:
      https://claude.ai/artifact/SkDyaqDS6dbtsuEVL4QkQh (picks in db
      picks/current). Building B (picture tray, merged shots) meanwhile.
    id: a-2026-11-17t06-10-17-219z
  - type: activity
    user: Agent
    date: '2026-11-17T06:23:39.000Z'
    comment: Updated implementation link.
    id: a-2026-11-17t06-23-39-000z
  - type: comment
    user: Agent
    comment: >-
      PR #565: screenshot tray (pick B mock) + Name field. Review fixes in
      22b25efe. Local checks green (unit, typecheck, lint, build, atlas e2e).
      Handed to the coordinator for the dev build and merge. Mock pick still
      open: https://claude.ai/artifact/SkDyaqDS6dbtsuEVL4QkQh
    date: '2026-11-17T06:43:49.934Z'
    completionComment: true
    id: c-2026-11-17t06-43-49-934z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-17T06:43:49.934Z'
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/565'
---
Guy asked (2026-11-17) whether an atlas strategy can be imported from a screenshot, pasted or picked from a file.

Feasible: main's tree fitter (tree-fit.ts, ATLAS_FIT) finds the atlas tree in a picture; lit blue lines + blue-glowing frames give the taken passives; groups not reaching the start join by the shortest path. Measured on Guy's real shots: 0073 13/13, 0074 (zoomed out) 13/13, no false atlas on 73 other screenshots. Limits: off-screen/HUD-hidden parts need more shots (merged), notable type picks aren't on screen, phone photos of a monitor won't work.

Plan: mocks in the PoE 1 look with Pick buttons, build the recommended option meanwhile. Branch woke/atlas-shot-import, worktree E:\Git\woke\wt\atlas-shot-import.
