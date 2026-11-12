---
id: WOKEPOET-73
title: 'Settings Text size changes window size, not text'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T09:31:52.823Z'
    comment: Created ticket.
    id: a-2026-11-05t09-31-52-823z
  - type: activity
    user: Agent
    date: '2026-11-05T10:01:39.986Z'
    comment: >-
      PR #143 up: real Text size (100-150%), old control renamed Price check
      window size. Local checks pass, review findings fixed. Merge pending the
      cloud step.
    id: a-2026-11-05t10-01-39-986z
  - type: comment
    user: Agent
    comment: >-
      Merged as be102406 and running on the dev build. New Text size slider
      (100-150%) changes text only; old control renamed Price check window size.
    date: '2026-11-05T10:15:55.552Z'
    completionComment: true
    id: c-2026-11-05t10-15-55-552z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-05T10:15:55.552Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:16:57.892Z'
needsAction: null
reviewState: null
---
Guy: the Settings "Text size" option makes windows bigger instead of text. It sets the root font size (rem), which scales the whole APT window. Fix: real text scale for all text; old control renamed to what it does.
