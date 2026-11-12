---
id: WOKEPOET-63
title: 'Price check: honour rate limit penalties'
status: Done
priority: Critical
effort: S
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-37
history:
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:29.797Z'
    comment: Created ticket.
    id: a-2026-11-05t08-10-29-797z
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:29.797Z'
    comment: Created as subtask of WOKEPOET-37.
    id: a-2026-11-05t08-10-29-797z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-05T08:16:39.170Z'
  - type: comment
    user: Agent
    comment: >-
      **PR #127 is reviewed and waiting on the cloud merge.** Penalties are now
      honoured, including for queued requests, and Retry counts down. Work is on
      branch claude/pc-rate-limit-penalty in a separate clone, not on this
      board's worktree. Browser button and penalty persistence across reloads
      left out as lesser risks. No docs needed: internal behaviour.
    date: '2026-11-05T08:25:31.672Z'
    completionComment: true
    id: c-2026-11-05t08-25-31-672z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-05T08:25:31.672Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:16:54.485Z'
needsAction: null
reviewState: null
---
> TL;DR: After a 429 the client lets a search through after 12 s while the server restricts for 60 s. Read the penalty and Retry-After, block requests until it ends, show a countdown, let Measure wait it out.

`common.ts` reads only the first state field; no renderer code reads Retry-After; `drivers.ts` retry regex only matches the client's own message. Report: https://claude.ai/artifact/NciFiZFWAd2WUQJBUrJhqU finding 4.
