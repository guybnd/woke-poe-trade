---
id: WOKEPOET-585
title: Surface hidden features with hints
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - feature
  - epic
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-25T02:52:53.493Z'
    comment: Created ticket.
    id: a-2026-11-25t02-52-53-493z
  - type: comment
    user: Agent
    comment: 'Audit page: https://claude.ai/artifact/Dtd7RBydqG5BhJet5cswq6'
    date: '2026-11-25T02:52:57.316Z'
    selfAttested: true
    pin: true
    id: c-2026-11-25t02-52-57-316z
  - type: activity
    user: Agent
    date: '2026-11-25T06:27:21.439Z'
    comment: >-
      Part 1 (586) shipped in PR 903 (78bac8c). Parts 2 (587) and 3 (588) still
      open.
    id: a-2026-11-25t06-27-21-439z
  - type: activity
    user: Agent
    date: '2026-11-25T08:17:22.093Z'
    comment: Part 2 (587) shipped in PR 924 (045a586). Part 3 (588) still open.
    id: a-2026-11-25t08-17-22-093z
  - type: comment
    user: Agent
    comment: 'All three parts shipped: PRs 903, 924, 928.'
    date: '2026-11-25T09:16:15.247Z'
    completionComment: true
    id: c-2026-11-25t09-16-15-247z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-25T09:16:15.247Z'
  - type: comment
    user: Agent
    comment: 'Epic done across PRs 903, 924 and 928 (final 75399bb).'
    completionComment: true
    date: '2026-11-25T09:16:20.315Z'
    id: c-2026-11-25t09-16-20-315z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T09:16:21.612Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:45.721Z'
subtasks:
  - WOKEPOET-586
  - WOKEPOET-587
  - WOKEPOET-588
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/928'
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
Epic: teach players the hidden features (hints, tip lines, hotkey peeks, a price check tour). Branch: claude/project-thread-0b8q87.

Guy's picks: build P1–P7, F1–F3, F5–F15 and F17. Skip F4, F16 and F18. Ctrl+Space options C1–C4 are still unpicked.
