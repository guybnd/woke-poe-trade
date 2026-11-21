---
id: WOKEPOET-465
title: 'After-map toast: resizing gives room, not zoom'
status: Done
priority: Medium
effort: S
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T14:53:39.700Z'
    comment: Created ticket.
    id: a-2026-11-21t14-53-39-700z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T14:53:43.680Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t14-53-43-680z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T14:53:43.680Z'
  - type: comment
    user: Agent
    comment: PR 746 merged (f1264621) after two adversarial review passes and green CI.
    date: '2026-11-21T15:18:01.981Z'
    completionComment: true
    id: c-2026-11-21t15-18-01-981z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T15:18:01.981Z'
  - type: comment
    user: Agent
    comment: >-
      Merged PR 746: the after-map toast's corner sets width and min-height
      (chipSize) instead of a zoom; only UI size / Panel size zoom it. Old
      chipScale ignored.
    completionComment: true
    date: '2026-11-21T15:18:05.740Z'
    id: c-2026-11-21t15-18-05-740z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T15:18:06.436Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/746'
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
> **TL;DR** Guy: resizing the after-map summary scales everything instead of giving the content more space. The corner grip set a zoom (chipScale) since PR 693, not PR 736. Make the grip set width/height; only UI size / Panel size scale it.
