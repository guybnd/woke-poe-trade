---
id: WOKEPOET-221
title: 'Tree overlay: a left-drag anywhere moves the drawing'
status: Done
priority: Low
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-218
history:
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:07.600Z'
    comment: Created ticket.
    id: a-2026-11-12t11-19-07-600z
  - type: activity
    user: Agent
    date: '2026-11-12T11:19:07.600Z'
    comment: Created as subtask of WOKEPOET-218.
    id: a-2026-11-12t11-19-07-600z
  - type: status_change
    from: Grooming
    to: Backlog
    user: Agent
    date: '2026-11-12T11:55:02.915Z'
  - type: comment
    user: Agent
    comment: 'Guy 2026-11-13: build now.'
    date: '2026-11-13T03:02:39.304Z'
    selfAttested: true
    id: c-2026-11-13t03-02-39-304z
  - type: status_change
    from: Backlog
    to: Todo
    user: Agent
    date: '2026-11-13T03:02:41.204Z'
  - type: comment
    user: Agent
    comment: >-
      Merged in #408 (af34d082): tree drawing follows drags only from the game
      window.
    date: '2026-11-13T03:29:11.333Z'
    completionComment: true
    id: c-2026-11-13t03-29-11-333z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-13T03:29:11.333Z'
  - type: comment
    user: Agent
    comment: >-
      Tree overlay follows a left-drag only when the press lands on the game
      window (physical pixels on both sides, no DPI conversion). Merged in #408
      (af34d082), live on the dev build.
    completionComment: true
    date: '2026-11-13T03:29:18.576Z'
    id: c-2026-11-13t03-29-18-576z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-13T03:29:18.953Z'
needsAction: null
reviewState: approved
baselineCommit: 9747783386088b67140c621fed5865bf72798b69
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/408'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/mechanics/covens.ts
    additions: 79
    deletions: 0
  - file: renderer/src/web/woke/mechanics/data.ts
    additions: 17
    deletions: 0
  - file: renderer/src/web/woke/mechanics/guide.ts
    additions: 6
    deletions: 0
  - file: renderer/src/web/woke/ui/game-icons.ts
    additions: 2
    deletions: 0
  - file: renderer/test/woke/economy.test.ts
    additions: 3
    deletions: 0
  - file: renderer/test/woke/mechanics-guide.test.ts
    additions: 15
    deletions: 0
---
main/src/woke/tree-overlay.ts onDown follows any left button drag, e.g. on another monitor, until the next settle. Skipped for now: needs the game window's bounds in uiohook's pixel space (DPI) to be checked first.
