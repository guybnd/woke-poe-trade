---
id: WOKEPOET-285
title: 'Campaign: auto-pass kill steps from boss lines; short boss names'
status: Ready
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T05:31:17.534Z'
    comment: Created ticket.
    id: a-2026-11-14t05-31-17-534z
  - type: activity
    user: Agent
    date: '2026-11-14T05:37:43.298Z'
    comment: Updated implementation link.
    id: a-2026-11-14t05-37-43-298z
  - type: comment
    user: Agent
    comment: >-
      PR #444 is ready. Local checks pass, and the adversarial review found
      nothing serious. A repeat-line test was added after the review. Merges
      through the cloud merge thread.
    date: '2026-11-14T05:37:44.429Z'
    completionComment: true
    id: c-2026-11-14t05-37-44-429z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-14T05:37:44.429Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/444'
needsAction: null
---
> **TL;DR:** The campaign tracker ticks off a boss kill step when Client.txt logs that boss's defeat line (Sin naming the god, e.g. "Sin: Abberath!"). Kill steps show only the boss's first name.

- Data: renderer/src/web/woke/campaign/boss-lines.ts, 25 lines from Guy's real Client.txt, each pinned to zone + speaker + exact text, kept only when said once per kill, after the fight, with no death after it.
- advanceOnKill never skips another boss's kill step in the same zone (Harvest order).
- Left out on purpose: lines said at fight start or mid-fight (Merveil, Brutus, Kaom, Piety "Kill me!", Shavronne), and bosses that log no line.
- Branch woke/boss-line-tick in E:\Git\woke-campaign-trail.
