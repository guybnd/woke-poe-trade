---
id: WOKEPOET-364
title: >-
  Saved lists, step 2: Atlas and PoB on the shared list; folders and drag for
  Regex and Trade
status: Released
priority: None
effort: L
assignee: unassigned
tags:
  - cleanup
  - ui
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-354
history:
  - type: activity
    user: Agent
    date: '2026-11-17T12:08:49.115Z'
    comment: Created ticket.
    id: a-2026-11-17t12-08-49-115z
  - type: activity
    user: Agent
    date: '2026-11-17T12:08:49.115Z'
    comment: Created as subtask of WOKEPOET-354.
    id: a-2026-11-17t12-08-49-115z
  - type: activity
    user: Agent
    date: '2026-11-17T12:43:23.944Z'
    comment: >-
      Parity 1/4 up: PR #587 (woke/saved-tree-atlas) — shared/saved-tree,
      use-saved-tree, SavedTree.vue; Atlas on it; parity e2e. Next: Regex
      library, Trade searches, PoB builds (order kept in widget config, Guy's
      pick).
    id: a-2026-11-17t12-43-23-944z
  - type: activity
    user: Agent
    date: '2026-11-17T13:12:44.163Z'
    comment: >-
      #587 merged (Atlas on shared tree). Parity 2/4 up: PR #590
      (woke/saved-tree-regex-2), Regex library on the shared tree; locked
      Atlas/PoB folders. Next: Trade searches, PoB builds.
    id: a-2026-11-17t13-12-44-163z
  - type: activity
    user: Agent
    date: '2026-11-17T14:03:46.142Z'
    comment: >-
      #590 and #594 merged. Parity 4/4 up: PR #595 (woke/saved-tree-pob-2), PoB
      builds on the shared tree, order kept in app settings, folder moves on
      disk via pob-move-folder. Parity e2e covers all four lists. Close after
      #595 merges.
    id: a-2026-11-17t14-03-46-142z
  - type: comment
    user: Agent
    comment: >-
      All four parity PRs merged (#587, #590, #594, #595); #595 shipped in
      v1.330.9.
    date: '2026-11-18T05:57:15.127Z'
    completionComment: true
    id: c-2026-11-18t05-57-15-127z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-18T05:57:15.127Z'
  - type: comment
    user: Agent
    comment: >-
      Saved lists parity 1-4 merged (#587, #590, #594, #595); shipped in
      v1.330.9.
    completionComment: true
    date: '2026-11-18T05:57:21.408Z'
    id: c-2026-11-18t05-57-21-408z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T05:57:21.818Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:31:02.893Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/595'
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
> **TL;DR:** Guy picked the follow-up to #585: Atlas strategies and PoB builds use the shared saved-list parts (row keys, rename in place, remove with Undo), and Regex library and Trade searches get nested folders and drag reorder, lifted from Atlas into shared code.

Keep each list's current behaviour; PoB keeps its files-on-disk data source. Characterization tests first; one or two PRs.
