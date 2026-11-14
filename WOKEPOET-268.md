---
id: WOKEPOET-268
title: 'PoB gems list in campaign order (act, then quest)'
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - pob
  - ux
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T01:34:04.141Z'
    comment: Created ticket.
    id: a-2026-11-14t01-34-04-141z
  - type: activity
    user: Agent
    date: '2026-11-14T01:38:58.311Z'
    comment: >-
      PR #428 up (option A), review + local checks pass; handed to coordinator
      for merge. Layout pick asked in thread:
      https://claude.ai/artifact/BLnnmPq4FTgn6P9Zb26Hyu
    id: a-2026-11-14t01-38-58-311z
  - type: activity
    user: Agent
    date: '2026-11-14T01:45:11.430Z'
    comment: >-
      Guy picked C (quest headings); pushed 721c4652 to PR #428, checks pass,
      back with coordinator for merge.
    id: a-2026-11-14t01-45-11-430z
  - type: comment
    user: Agent
    comment: >-
      Merged as #428 (32781d8b): campaign order with act dividers and quest
      headings, Guy's C + A. On the dev build.
    date: '2026-11-14T02:01:34.743Z'
    completionComment: true
    id: c-2026-11-14t02-01-34-743z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-14T02:01:34.743Z'
  - type: comment
    user: Agent
    comment: >-
      Merged #428 (32781d8b). Gem list ordered by act, quest, level; act
      dividers + quest headings; trade/drop last. Dev build on master.
    completionComment: true
    date: '2026-11-14T02:01:35.936Z'
    id: c-2026-11-14t02-01-35-936z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-14T02:01:36.305Z'
needsAction: null
baselineCommit: 407ba7f1f2c478fed465d0b71f60be15ccdb1be0
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/428'
swimlane: null
diffSummary:
  - file: testing/e2e/loot-filter.spec.ts
    additions: 1
    deletions: 1
---
Build panel "Gems by level" list sorted by gem level; Guy wants it ordered by when the campaign gives each gem (act, then quest order, then level), e.g. Fortify (A Fixture of Fate, Act 3) after Act 2 gems.

Branch woke/gems-campaign-order (clone E:\Git\woke-gem-order). Built option A (act dividers, level kept, trade/drop last). Mocks with options A/B/C: https://claude.ai/artifact/BLnnmPq4FTgn6P9Zb26Hyu — awaiting Guy's pick.
