---
id: WOKEPOET-369
title: '1.330.10 picks: graphics card on by default, trim old price snapshots'
status: Released
priority: High
effort: None
assignee: unassigned
tags:
  - perf
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-18T06:23:30.959Z'
    comment: Created ticket.
    id: a-2026-11-18t06-23-30-959z
  - type: comment
    user: Agent
    comment: >-
      Merged as 24fe7b66. Graphics-card drawing is now on by default (a player's
      own choice is kept). Old price snapshots are trimmed a minute after start;
      on Guy's PC that's ~450 MB.
    completionComment: true
    date: '2026-11-18T06:34:34.630Z'
    id: c-2026-11-18t06-34-34-630z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T06:34:35.202Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:31:01.513Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/605'
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
version: '0003'
releasedAt: '2026-11-27T04:30:50.393Z'
releaseDocPath: release-notes/0003
---
Guy's pre-release picks. PR #605: gpuDrawing defaults on (gpuDrawingChosen keeps a player's own choice; release note: untick the tray's graphics-card box if the screen goes black). Old price snapshots trimmed a minute after start to day rows + newest + 6 h/24 h movers' points (~450 MB on Guy's PC).
