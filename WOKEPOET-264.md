---
id: WOKEPOET-264
title: 'Atlas strategies list: drag and drop and tidier folders'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - atlas
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-13T13:52:55.806Z'
    comment: Created ticket.
    id: a-2026-11-13t13-52-55-806z
  - type: comment
    user: Agent
    comment: >-
      Pick a layout (A drop line, B folder boxes, C folder rail) and any extras
      (X1 several at once, X2 sort menu, X3 Alt+arrow keys, X4 folder menu
      tidy-ups) at https://claude.ai/artifact/VNJuz38dxzkSfDc116PJCf. I
      recommend A + X2.
    date: '2026-11-13T13:53:00.741Z'
    id: c-2026-11-13t13-53-00-741z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-13T13:53:00.741Z'
    comment: >-
      Pick a layout (A drop line, B folder boxes, C folder rail) and any extras
      (X1 several at once, X2 sort menu, X3 Alt+arrow keys, X4 folder menu
      tidy-ups) at https://claude.ai/artifact/VNJuz38dxzkSfDc116PJCf. I
      recommend A + X2.
  - type: comment
    user: Agent
    comment: 'Guy picked A + X1, X2, X3, X4.'
    date: '2026-11-13T13:55:58.375Z'
    id: c-2026-11-13t13-55-58-375z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-13T13:55:58.375Z'
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-13T13:55:58.375Z'
  - type: comment
    user: Agent
    comment: 'Merged as #420 (71e754d3), live on the dev build.'
    date: '2026-11-13T14:28:25.192Z'
    completionComment: true
    id: c-2026-11-13t14-28-25-192z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-13T14:28:25.192Z'
  - type: comment
    user: Agent
    comment: >-
      Drag and drop for strategies and folders, loose strategies listed first,
      Ctrl/Shift multi-select, sort menu, Alt+arrows, folder menu tidy-ups.
      Merged 71e754d3, live on dev.
    completionComment: true
    date: '2026-11-13T14:28:26.538Z'
    id: c-2026-11-13t14-28-26-538z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-13T14:28:26.827Z'
swimlane: null
needsAction: null
baselineCommit: 3defd75f96d427b12eabf1301a1d6ad20d1b18ce
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/420'
diffSummary:
  - file: renderer/src/web/woke/mechanics/data.ts
    additions: 4
    deletions: 4
  - file: renderer/src/web/woke/mechanics/guide.ts
    additions: 1
    deletions: 1
---
Drag strategies to reorder and between folders, drag folders to reorder. Loose strategies currently draw under the last folder and look like its contents (the "0 on 3.30" report). Mocks: https://claude.ai/artifact/VNJuz38dxzkSfDc116PJCf (layout A/B/C + extras X1-X4), waiting on Guy's pick. Clone E:\Git\woke-atlas, branch woke/atlas-dnd.
