---
id: WOKEPOET-525
title: One global setting for what time per hour rates count
status: Released
priority: Medium
effort: M
assignee: unassigned
tags:
  - net-worth
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-24T02:02:11.512Z'
    comment: Created ticket.
    id: a-2026-11-24t02-02-11-512z
  - type: comment
    user: Agent
    comment: >-
      PR 831 merged (5857b7c7): synced Play / + Hideout / All chooser in every
      per hour tool, plus Settings. Review fixes in, CI green.
    date: '2026-11-24T02:39:06.982Z'
    completionComment: true
    id: c-2026-11-24t02-39-06-982z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T02:39:06.982Z'
  - type: comment
    user: Agent
    comment: >-
      Merged PR 831 (5857b7c7). Guy picked B: a Play / + Hideout / All chooser
      beside every per hour, one synced value config.woke.rateTime (default
      Play). Runs no longer count AFK/closed time.
    completionComment: true
    date: '2026-11-24T02:39:16.401Z'
    id: c-2026-11-24t02-39-16-401z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T02:39:17.187Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:06:00.760Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/831'
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
version: 1.30.20
releasedAt: '2026-11-25T04:05:49.382Z'
releaseDocPath: release-notes/1.30.20
---
From the Net worth bug hunt: run per hour counts game-closed and AFK time. Guy: "have a global setting for this together with all the other similar counters".

Plan (pick A, mockup https://claude.ai/artifact/SiJcFcG5WqEcNpt2S2gjRT): Settings → Game & league → Per hour → Time counted: Play only (default) / Play + hideout / All time. Used by Net worth rates, strategy runs, Session story night card, Session analytics, Ctrl+Space. Per-tool hub toggles removed. Branch woke/afk-rates.
