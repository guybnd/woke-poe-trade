---
id: WOKEPOET-432
title: 'Session story: Mirage chip on the after-map toast'
status: Released
priority: None
effort: S
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T03:39:55.376Z'
    comment: Created ticket.
    id: a-2026-11-21t03-39-55-376z
  - type: comment
    user: Agent
    comment: >-
      PR #700 merged (ba148c02). Mirage chip from "[LOADING SCREEN] (Mirage of
      X)"; separate review clean; CI green.
    date: '2026-11-21T03:50:01.885Z'
    completionComment: true
    id: c-2026-11-21t03-50-01-885z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T03:50:01.885Z'
  - type: comment
    user: Agent
    comment: >-
      Merged PR #700: maps where you stepped into a Mirage get a "Mirage" chip
      (toast, map history, Ctrl+Space search), from Client.txt's "[LOADING
      SCREEN] (Mirage of X)". Mirage reuses the map's area id + seed, so it
      stays one run. Separate review found no bugs; CI green.
    completionComment: true
    date: '2026-11-21T03:50:06.243Z'
    id: c-2026-11-21t03-50-06-243z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T03:50:06.708Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:42.757Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/700'
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
version: '00002'
releasedAt: '2026-11-25T11:52:41.308Z'
releaseDocPath: release-notes/00002
---
> **TL;DR:** Maps where you stepped into a Mirage get a "Mirage" chip on the after-map toast, in map history and in Ctrl+Space search.

Signal: entering a Mirage reloads the same map instance (same area id and seed) and Client.txt logs `[LOADING SCREEN] (Mirage of Fortress)`. Verified in Guy's real Client.txt (11 hits, 2026-11-19..21). A Mirage you never step into leaves no log line, so it can't be shown.

Branch: woke/mirage-chip
