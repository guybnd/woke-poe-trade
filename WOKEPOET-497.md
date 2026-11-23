---
id: WOKEPOET-497
title: Currency icons instead of c/div on the poe.ninja card and verdicts
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-23T03:11:22.577Z'
    comment: Created ticket.
    id: a-2026-11-23t03-11-22-577z
  - type: comment
    user: Agent
    comment: >-
      PR 781 merged (b6bc3eac): WPriceText draws c/div as icons on the poe.ninja
      card, poe.ninja verdict and exchange verdict.
    date: '2026-11-23T03:27:25.163Z'
    completionComment: true
    id: c-2026-11-23t03-27-25-163z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-23T03:27:25.163Z'
  - type: comment
    user: Agent
    comment: >-
      Merged (b6bc3eac). Review fixes included (unit only as its own word, 12px
      icon floor, Orb titles).
    completionComment: true
    date: '2026-11-23T03:27:26.303Z'
    id: c-2026-11-23t03-27-26-303z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-23T03:27:26.808Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/781'
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
Guy (follow-up to WOKEPOET-487): the instant poe.ninja card shows "6.9 div" / "1,436c" as text. PR https://github.com/guybnd/woke-poe-trade/pull/781 adds WPriceText and uses it on the card, NinjaVerdict and BulkVerdict.
