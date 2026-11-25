---
id: WOKEPOET-514
title: 'Atlas strategies: import poeatlasplanner.com links'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - atlas
  - bug
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-23T11:11:02.661Z'
    comment: Created ticket.
    id: a-2026-11-23t11-11-02-661z
  - type: comment
    user: Agent
    comment: >-
      PR #801 (head a7e0d4d2): planner links decode, with the adversarial
      review's findings fixed. Local checks are green. Handed to the coordinator
      for merge.
    date: '2026-11-23T11:11:05.971Z'
    completionComment: true
    id: c-2026-11-23t11-11-05-971z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-23T11:11:05.971Z'
  - type: comment
    user: Agent
    comment: >-
      Merged at 64131cef; dev build reloaded onto it. The screenshot import part
      still waits on Guy's resend.
    completionComment: true
    date: '2026-11-23T11:16:03.492Z'
    id: c-2026-11-23t11-16-03-492z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-23T11:16:05.498Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:06:04.683Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/801'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/pob-builds/BuildDetail.vue
    additions: 4
    deletions: 4
  - file: renderer/src/web/woke/pob-builds/build-model.ts
    additions: 14
    deletions: 0
  - file: renderer/test/woke/pob-builds.test.ts
    additions: 39
    deletions: 1
version: 1.30.20
releasedAt: '2026-11-25T04:05:49.382Z'
releaseDocPath: release-notes/1.30.20
---
Guy (2026-11-23): a poeatlasplanner.com link (#p=, 3.30.0) wouldn't import, and neither would a screenshot (not received yet). The link format was inferred from his link and is now decoded: PR #801. The screenshot is waiting on a resend.
