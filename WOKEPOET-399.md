---
id: WOKEPOET-399
title: Ctrl+Space finds Blight ring anoints with their oils
status: Released
priority: Medium
effort: S
assignee: unassigned
tags:
  - search
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-19T14:56:00.522Z'
    comment: Created ticket.
    id: a-2026-11-19t14-56-00-522z
  - type: activity
    user: Agent
    date: '2026-11-19T14:59:13.600Z'
    comment: >-
      Built layout A on woke/ring-anoints (a06cb168), checks pass, handed to
      coordinator for merge. Layout pick asked in the project thread; mocks
      https://claude.ai/artifact/NwWhryEEKsjkAP5hqdRMhc
    id: a-2026-11-19t14-59-13-600z
  - type: activity
    user: Agent
    date: '2026-11-19T15:05:32.470Z'
    comment: >-
      Separate adversarial review done; fixes in cf5c73f8 (English words on any
      language, Glacial Cage, less clutter). Handed to coordinator for merge.
    id: a-2026-11-19t15-05-32-470z
  - type: comment
    user: Agent
    comment: >-
      Built layout A, reviewed by a fresh adversarial reviewer and fixed, checks
      pass. Merged as #659.
    date: '2026-11-19T15:10:57.868Z'
    completionComment: true
    id: c-2026-11-19t15-10-57-868z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-19T15:10:57.868Z'
  - type: comment
    user: Agent
    comment: >-
      Ctrl+Space lists the 91 Blight ring anoints with their two oils, prices
      and total (layout A). Merged as #659, master e70a12d3. Guy's layout pick
      (A/B/C) still open.
    completionComment: true
    date: '2026-11-19T15:11:01.494Z'
    id: c-2026-11-19t15-11-01-494z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-19T15:11:02.159Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:50.612Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/659'
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
Search palette lookup for the 91 two-oil Blight ring anoints (tower enchants), from the anoint recipes in the stat data. Card per enchant reusing the notable Anoint list from #655 (WOKEPOET-398): oil icons, poe.ninja prices, total. Shows when the query names a tower or says ring/anoint/blight. All 91 recipes checked against poedb's Anoint Rings list. Mocks A/B/C: https://claude.ai/artifact/NwWhryEEKsjkAP5hqdRMhc (building A). Branch woke/ring-anoints, worktree E:\Git\woke\wt\ring-anoints.
