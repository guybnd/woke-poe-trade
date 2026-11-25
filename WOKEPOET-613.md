---
id: WOKEPOET-613
title: Structured help tooltips app-wide
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - epic
  - polish
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-25T10:56:20.030Z'
    comment: Created ticket.
    id: a-2026-11-25t10-56-20-030z
  - type: comment
    user: Agent
    comment: >-
      Format picks: https://claude.ai/artifact/RnaszX2YA8fEn2RnGbD5fw (building
      recommended A meanwhile).
    date: '2026-11-25T10:56:22.805Z'
    selfAttested: true
    pin: true
    id: c-2026-11-25t10-56-22-805z
  - type: comment
    user: Agent
    comment: >-
      PR 935 merged (942b6c5): card format + map/Valdo/price check tips. 616-618
      still open, partly done.
    date: '2026-11-25T12:29:36.352Z'
    completionComment: true
    id: c-2026-11-25t12-29-36-352z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-25T12:29:36.352Z'
  - type: comment
    user: Agent
    comment: >-
      Merged at 942b6c5; dev build reloaded. Subtasks 616-618 remain open
      (partly done).
    completionComment: true
    date: '2026-11-25T12:29:44.374Z'
    id: c-2026-11-25t12-29-44-374z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T12:29:45.742Z'
subtasks:
  - WOKEPOET-614
  - WOKEPOET-615
  - WOKEPOET-616
  - WOKEPOET-617
  - WOKEPOET-618
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/935'
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
Epic: help tooltips are wordy and hard to read. Turn them into proper sentences with bullet points and formatting, audited across the whole app (Guy, 2026-11-25: "these kind of tooltips are so wordy and hard to read, why not in proper sentence with bullet points and formatting. we need a proper audit across the board for this too").
