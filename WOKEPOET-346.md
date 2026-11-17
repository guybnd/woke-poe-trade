---
id: WOKEPOET-346
title: Performance audit of the overlay (master)
status: Done
priority: High
effort: None
assignee: unassigned
tags:
  - perf
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-17T04:10:18.218Z'
    comment: Created ticket.
    id: a-2026-11-17t04-10-18-218z
  - type: activity
    user: Agent
    date: '2026-11-17T05:40:32.751Z'
    comment: >-
      PR #563 (woke/perf-filter-edits) sent to merge. Edits 135-170 → 50-87 ms,
      overlay close 100-145 → 58-67 ms (prod build, Guy's config). Open:
      settings file holds ~1 MB of undo/save history (move out of config.json);
      hidden/minimised panels keep ~4k DOM nodes (memory only); stack-sizes e2e
      test fails on master.
    id: a-2026-11-17t05-40-32-751z
  - type: comment
    user: Agent
    comment: >-
      PR #563 merged (fc813394): filter edits 135-170 → 50-87 ms, overlay close
      100-145 → 58-67 ms. A follow-up PR releases the parse cache when idle.
    date: '2026-11-17T05:53:15.853Z'
    completionComment: true
    id: c-2026-11-17t05-53-15-853z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-17T05:53:15.853Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as fc813394. Loot filter editor edits went from 135-170 ms to 50-87
      ms, and closing the overlay from 100-145 ms to 58-67 ms (prod build, Guy's
      config). Follow-ups: the parse-cache idle release (small PR), moving the
      ~1 MB undo/save history out of config.json (waiting on Guy), and the
      stack-sizes e2e test that already fails on master.
    completionComment: true
    date: '2026-11-17T05:53:19.097Z'
    id: c-2026-11-17t05-53-19-097z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-17T05:53:19.527Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/563'
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
Guy finds the overlay slow, mostly the loot filter editor. Audit master broadly: renderer responsiveness, reactivity/watchers, unvirtualized lists, repeated filter parsing/matching, IPC, memory and listeners. Rank findings by impact, fix the clear wins via PRs. The Gear tab (woke/gear-page) is owned by the Gear redesign thread; don't touch it.

Worktree: E:\Git\woke\wt\perf-audit, branch woke/perf-audit.
