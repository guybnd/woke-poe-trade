---
id: WOKEPOET-89
title: 'Run timer: auto-pause when idle or closed, split out town time'
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - feature
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T10:54:31.746Z'
    comment: Created ticket.
    id: a-2026-11-05t10-54-31-746z
  - type: comment
    user: Agent
    comment: >-
      Merged as #366 (1942be2a): the run pauses after 20 minutes without game
      activity, and town and hideout time show apart with the total (Guy's B and
      note). Open question to Guy: should chat count as activity?
    date: '2026-11-12T07:17:05.403Z'
    completionComment: true
    id: c-2026-11-12t07-17-05-403z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T07:17:05.403Z'
needsAction: null
---
Step 7 of the [gameplay helpers critique](https://claude.ai/artifact/NjdEZhrQZBmKwRB56yTsoj). Mock first.

Only manual pause exists today. In the replay, 8 of 24 finished runs read over 24 hours, the longest 165,331 minutes. Auto-pause when the game is closed or the log goes quiet, and separate town and hideout time.
