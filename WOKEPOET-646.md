---
id: WOKEPOET-646
title: Give over-quality bases their own look
status: Done
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
    date: '2026-11-26T13:09:41.210Z'
    comment: Created ticket.
    id: a-2026-11-26t13-09-41-210z
  - type: comment
    user: Agent
    comment: 'Waiting on Guy''s pick: https://claude.ai/artifact/ED7dfyyS7T6EJRzg3LF9vY'
    date: '2026-11-26T13:09:44.870Z'
    selfAttested: true
    pin: true
    id: c-2026-11-26t13-09-44-870z
  - type: comment
    user: Agent
    comment: >-
      Guy picked B: keep the Magic/Rare look and add a mark. PR 973
      (https://github.com/guybnd/woke-poe-trade/pull/973) is open, waiting on
      Guy's look before merge.
    date: '2026-11-26T13:24:24.304Z'
    selfAttested: true
    pin: true
    id: c-2026-11-26t13-24-24-304z
  - type: activity
    user: Agent
    date: '2026-11-26T13:24:25.010Z'
    comment: Updated implementation link.
    id: a-2026-11-26t13-24-25-010z
  - type: comment
    user: Agent
    comment: PR 973 merged (8181e1b).
    date: '2026-11-27T03:42:24.620Z'
    completionComment: true
    id: c-2026-11-27t03-42-24-620z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-27T03:42:24.620Z'
  - type: comment
    user: Agent
    comment: Merged at 8181e1b; dev build reloaded.
    completionComment: true
    date: '2026-11-27T03:42:29.224Z'
    id: c-2026-11-27t03-42-29-224z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-27T03:42:29.835Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/973'
needsAction: null
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
---
Over-quality bases get their own look. Branch: claude/project-thread-r8tiuh.
