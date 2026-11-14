---
id: WOKEPOET-269
title: 'Campaign: tick off Trial of Ascendancy from Izaro''s finished line'
status: Done
priority: Medium
effort: S
assignee: unassigned
tags:
  - campaign
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T02:14:23.785Z'
    comment: Created ticket.
    id: a-2026-11-14t02-14-23-785z
  - type: activity
    user: Agent
    date: '2026-11-14T02:19:10.960Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/429. Review clean; lint,
      typecheck, 3654 tests and build pass. Handed to the coordinator for the
      cloud merge.
    id: a-2026-11-14t02-19-10-960z
  - type: comment
    user: Agent
    comment: >-
      PR #429 is up. Izaro's trial-finished line (one of 6 fixed lines) in a
      campaign zone ticks the trial step. Checks pass and the review is clean.
      Waiting on the merge.
    date: '2026-11-14T02:19:12.309Z'
    completionComment: true
    id: c-2026-11-14t02-19-12-309z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-14T02:19:12.310Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 854290a4. Izaro's trial-finished line (one of 6 fixed lines) in
      a campaign zone ticks the "Complete Trial of Ascendancy" step.
    completionComment: true
    date: '2026-11-14T02:29:51.980Z'
    id: c-2026-11-14t02-29-51-980z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-14T02:29:52.392Z'
needsAction: null
baselineCommit: 407ba7f1f2c478fed465d0b71f60be15ccdb1be0
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/429'
swimlane: null
diffSummary:
  - file: testing/e2e/loot-filter.spec.ts
    additions: 1
    deletions: 1
---
> **TL;DR:** When Izaro says his trial-finished line in a campaign zone, the campaign card moves past the "Complete Trial of Ascendancy" step.

Guy's Client.txt (10 characters) shows Izaro says exactly one line per trial, on finishing it, the same line every run, and the same line in the act 6-10 copy and the endgame lab copy of that trial. Nothing is said on merely entering (a 2 s visit to an endgame trial logged nothing).

| Trial area | Line |
|---|---|
| Lower Prison 1_1_7_1 / 2_6_7_1 | Belief is the strongest metal of them all. |
| Chamber of Sins 2 1_2_6_2 / 2_7_5_2 | There is a fine line between consideration and hesitation... |
| Crypt 1 1_2_5_1 / 2_7_4 | Shine boldly so that all might find you when the night falls. |
| Crematorium 1_3_3_1 / 2_8_5 | Allow your wisdom to be tempered by the flames of the past. |
| Catacombs 1_3_6 / 2_9_7 | An emperor must bear two blades. Hope in the left hand. Surety in the right. |
| Imperial Gardens 1_3_15 / 2_10_9 | An emperor must know precisely where he stands. |

Built on branch woke/trial-auto-tick (log-parse isTrialFinished, route-parse advanceOnTrial, WidgetCampaign applyLines). Only campaign zones count; stops at the first step outside the zone, so a trial done on the first Lower Prison visit (before the town hand-ins) is not ticked by the line.
