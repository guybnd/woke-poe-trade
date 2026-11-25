---
id: WOKEPOET-454
title: 'UI size: one slider that scales everything'
status: Released
priority: Medium
effort: M
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T11:47:00.541Z'
    comment: Created ticket.
    id: a-2026-11-21t11-47-00-541z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T11:47:04.166Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t11-47-04-166z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T11:47:04.166Z'
  - type: activity
    user: Agent
    date: '2026-11-21T11:53:12.156Z'
    comment: >-
      Options A/B/C decision card posted in the project thread (A recommended).
      Option A built on branch woke/ui-size; review and CI running.
    id: a-2026-11-21t11-53-12-156z
  - type: activity
    user: Agent
    date: '2026-11-21T12:12:06.155Z'
    comment: Updated implementation link.
    id: a-2026-11-21t12-12-06-155z
  - type: comment
    user: Agent
    comment: PR 736 merged (17b24d0e) after two adversarial review passes and green CI.
    date: '2026-11-21T12:28:21.913Z'
    completionComment: true
    id: c-2026-11-21t12-28-21-913z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T12:28:21.913Z'
  - type: comment
    user: Agent
    comment: >-
      Merged PR 736: UI size (Settings › Look, toolbar cog menu −/+, Ctrl+Space
      bigger/smaller) multiplies Panel size, price check zoom and Pinned size;
      toolbar menu split; price check palette Size; Popover fixed under CSS
      zoom. Option B (per-panel size) not built.
    completionComment: true
    date: '2026-11-21T12:28:32.086Z'
    id: c-2026-11-21t12-28-32-086z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T12:28:32.502Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:57.528Z'
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/736'
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
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
version: '0001'
releasedAt: '2026-11-25T11:50:45.359Z'
releaseDocPath: release-notes/0001
---
> **TL;DR** Guy wants one setting that makes the whole UI bigger. Add a master UI size on Look & icon row that multiplies Panel size, the price check window and Pinned size; fold the four existing size sliders under "Fine-tune"; add Size to the price check palette menu; Ctrl+Space entries.

Decision card (options A/B/C) is in the project thread; A recommended and being built. B (per-panel size in each cog) is a possible follow-up.
