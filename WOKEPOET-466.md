---
id: WOKEPOET-466
title: Port upstream APT 3.30 fixes
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
    date: '2026-11-21T16:02:45.228Z'
    comment: Created ticket.
    id: a-2026-11-21t16-02-45-228z
  - type: activity
    user: Agent
    date: '2026-11-21T16:16:05.990Z'
    comment: >-
      All six ports committed; PR
      https://github.com/guybnd/woke-poe-trade/pull/749 open, CI and adversarial
      review running. Trade fetch JSON marks twice-corrupted listings with
      item.doubleCorrupted: true.
    id: a-2026-11-21t16-16-05-990z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T16:16:15.011Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t16-16-15-011z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T16:16:15.011Z'
  - type: comment
    user: Agent
    comment: >-
      PR 749 merged after adversarial review and green CI: six upstream 3.30
      ports, Twice Corrupted done Guy's way (both searched, chip on results).
    date: '2026-11-21T16:44:45.273Z'
    completionComment: true
    id: c-2026-11-21t16-44-45-273z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T16:44:45.273Z'
  - type: comment
    user: Agent
    comment: >-
      Merged PR 749 (792a0bed): temple rules + reminder text, More Threads
      (incl. Map mods regex token fix), Twice Corrupted chip on filter and
      result listings (fetch JSON item.doubleCorrupted; no trade filter),
      item-drop.json, Not Catalysed (off by default), veiled names. Review fixes
      applied. All CI green.
    completionComment: true
    date: '2026-11-21T16:44:54.589Z'
    id: c-2026-11-21t16-44-54-589z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T16:44:54.903Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:55.585Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/749'
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
Port upstream Awakened PoE Trade 3.30 changes as one PR:
1. Temple rules + reminder text (22006b33)
2. More Scarabs -> More Threads (fbebcedd)
3. Twice Corrupted chip in filter name + results (adapted 158843e1; no trade filter)
4. item-drop.json data (57b313cf, e5371540)
