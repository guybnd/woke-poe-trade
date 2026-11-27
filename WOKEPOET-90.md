---
id: WOKEPOET-90
title: 'Campaign tracker: keep route, gems and run per character'
status: Released
priority: Medium
effort: None
assignee: unassigned
tags:
  - feature
  - ui
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-05T10:54:34.535Z'
    comment: Created ticket.
    id: a-2026-11-05t10-54-34-535z
  - type: comment
    user: Agent
    comment: >-
      Merged as #367 (b3dccf03): one route per character, switching by itself
      (Guy's A). It switches after two level-ups of another character while the
      followed one has been quiet for 20 minutes. Known limits are in the PR.
    date: '2026-11-12T07:48:44.086Z'
    completionComment: true
    id: c-2026-11-12t07-48-44-086z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T07:48:44.086Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:11:32.463Z'
needsAction: null
version: '0000234'
releasedAt: '2026-11-27T16:11:26.816Z'
releaseDocPath: release-notes/0000234
---
Step 8 of the [gameplay helpers critique](https://claude.ai/artifact/NjdEZhrQZBmKwRB56yTsoj). Mock first.

There's one state per widget. A Strand visit past step 3 resets the route and clears ticked gems, and an endgame character entering a campaign zone wakes the route (72 wakes in the replay). The log names a character only on level-up, so the design has to handle that.
