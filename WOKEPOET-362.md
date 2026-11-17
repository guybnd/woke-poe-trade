---
id: WOKEPOET-362
title: 'One window keys helper (undo, save, back, close)'
status: Done
priority: None
effort: M
assignee: unassigned
tags:
  - cleanup
  - ux
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-354
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:10.753Z'
    comment: Created ticket.
    id: a-2026-11-17t09-44-10-753z
  - type: activity
    user: Agent
    date: '2026-11-17T09:44:10.753Z'
    comment: Created as subtask of WOKEPOET-354.
    id: a-2026-11-17t09-44-10-753z
  - type: comment
    user: Agent
    comment: >-
      PR #584 (woke/shared-window-keys): ui/window-keys + WPanel ? list; filter
      editor, settings, atlas tree, 4 mouse-back windows. Checks, e2e, perf
      pass.
    date: '2026-11-17T11:45:42.673Z'
    completionComment: true
    id: c-2026-11-17t11-45-42-673z
  - type: status_change
    from: Backlog
    to: Ready
    user: Agent
    date: '2026-11-17T11:45:42.673Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 5dad201b: ui/window-keys + WPanel ? list; filter editor,
      Settings, Atlas tree, mouse-back windows.
    completionComment: true
    date: '2026-11-17T11:55:47.417Z'
    id: c-2026-11-17t11-55-47-417z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-17T11:55:48.325Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/584'
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
> **TL;DR:** Ctrl+Z/Y/S, Esc and mouse back are wired per window, so they work in some and not others. One `useWindowKeys(el, {...})` that also fills the window's "?" key list.

Audit finding 8.
