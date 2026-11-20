---
id: WOKEPOET-411
title: 'Atlas screenshot import: website pictures read as 255 passives'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - atlas
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T04:52:29.900Z'
    comment: Created ticket.
    id: a-2026-11-20t04-52-29-900z
  - type: comment
    user: Agent
    comment: >-
      PR #670 squash-merged as 6a824ee9 after the adversarial review fixes. The
      dev build is switched to master.
    date: '2026-11-20T04:52:39.645Z'
    completionComment: true
    id: c-2026-11-20t04-52-39-645z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-20T04:52:39.645Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 6a824ee9: website atlas pictures read by their cream lines (143
      on Guy's shot), glow cap 8, review fixes.
    completionComment: true
    date: '2026-11-20T04:52:42.630Z'
    id: c-2026-11-20t04-52-42-630z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T04:52:43.056Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/670'
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
Guy (2026-11-20): a screenshot of pathofexile.com's atlas viewer imported as 255 passives. The page is grey with cream lines, and every frame has blue art, which the frame glow chained across the tree. Fixed in PR #670: website detection (dark-check retry, or cream lines on a dark page), cream tone, no HUD masks or frames on the web path, and the glow cap at 8. His shot now reads 143.
