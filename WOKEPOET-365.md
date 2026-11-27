---
id: WOKEPOET-365
title: 'Diagnostics freezes: safety-net walk and price history saves'
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
    date: '2026-11-17T14:09:48.482Z'
    comment: Created ticket.
    id: a-2026-11-17t14-09-48-482z
  - type: comment
    user: Agent
    comment: >-
      Merged as #596 (faster safety-net walk, lighter price history saves),
      shipped in v1.330.9. The 647 MB old-league price history trim is still
      Guy's call; tracked on the pre-release list.
    completionComment: true
    date: '2026-11-18T05:57:14.315Z'
    id: c-2026-11-18t05-57-14-315z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T05:57:14.812Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:31:03.052Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/596'
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
From Guy's Diagnostics (save to history 1.5 s, overlay busy up to 1.4 s, first paint 7.9 s). PR #596: byBase safety-net walk (1.8x), price saves send once + skip day-file rewrite on repeats. First paint is dev-build only. Open: 647 MB woke-market folder (old league snapshots), Guy's call.
