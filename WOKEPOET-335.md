---
id: WOKEPOET-335
title: 'Alt+F card: list the uniques a base can be, with prices'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-16T03:21:46.273Z'
    comment: Created ticket.
    id: a-2026-11-16t03-21-46-273z
  - type: activity
    user: Agent
    date: '2026-11-16T03:23:27.458Z'
    comment: >-
      Mocks A/B/C: https://claude.ai/artifact/7Gxb9djMwYyQVDBDiMpEiA (A
      recommended, building it).
    id: a-2026-11-16t03-23-27-458z
  - type: activity
    user: Agent
    date: '2026-11-16T03:35:29.301Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/549 up; review fixes in;
      tsc/lint/tests/build pass; sent to merge.
    id: a-2026-11-16t03-35-29-301z
  - type: comment
    user: Agent
    comment: 'Merged #549 (82f21841); dev overlay on master 2f800bcf.'
    date: '2026-11-16T03:49:16.681Z'
    completionComment: true
    id: c-2026-11-16t03-49-16-681z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-16T03:49:16.681Z'
  - type: comment
    user: Agent
    comment: >-
      Alt+F card lists the uniques a base can drop as with poe.ninja prices,
      sets-tier tag after a price move, own row, Foulborn line. Merged 82f21841;
      dev overlay on master 2f800bcf. Mock pick (A built) still open with Guy.
    completionComment: true
    date: '2026-11-16T03:49:21.147Z'
    id: c-2026-11-16t03-49-21-147z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-16T03:49:21.616Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/549'
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
Guy's ask (2026-11-16): the Alt+F "Filter rule for this item" card on a unique base (e.g. unid Imperial Claw in All uniques > Low) lists the uniques that base can drop as, with cached poe.ninja prices, marking the one that sets the tier. Reuse the loot filter's priceBreakdown/uniquesOnBase (same item data as Ctrl+Space base uniques). No trade searches. Mocks first, then build the recommended one. Data has no drop-restricted/league flag.
