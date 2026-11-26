---
id: WOKEPOET-628
title: 'UX consistency: shared UI pieces for Guy''s 15 picks'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - polish
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-622
history:
  - type: activity
    user: Agent
    date: '2026-11-26T02:01:54.465Z'
    comment: Created ticket.
    id: a-2026-11-26t02-01-54-465z
  - type: activity
    user: Agent
    date: '2026-11-26T02:01:54.465Z'
    comment: Created as subtask of WOKEPOET-622.
    id: a-2026-11-26t02-01-54-465z
  - type: comment
    user: Agent
    comment: >-
      PR 957 merged (43b597e). Pick 13 (shared item rows) was skipped and is not
      in this PR.
    date: '2026-11-26T03:45:36.221Z'
    selfAttested: true
    pin: true
    id: c-2026-11-26t03-45-36-221z
  - type: comment
    user: Agent
    comment: PR 957 merged (43b597e); pick 13 skipped.
    date: '2026-11-26T03:45:37.320Z'
    completionComment: true
    id: c-2026-11-26t03-45-37-320z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-26T03:45:37.320Z'
  - type: comment
    user: Agent
    comment: Merged at 43b597e; dev build reloaded. Pick 13 (shared item rows) skipped.
    completionComment: true
    date: '2026-11-26T03:45:43.342Z'
    id: c-2026-11-26t03-45-43-342z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T03:45:44.177Z'
  - type: comment
    user: Agent
    comment: >-
      Follow-up PR 958 (https://github.com/guybnd/woke-poe-trade/pull/958,
      d36b6e0): Net worth folds, Runs switches and no-match lines moved onto the
      shared pieces.
    date: '2026-11-26T04:30:15.704Z'
    selfAttested: true
    id: c-2026-11-26t04-30-15-704z
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/957'
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
Shared UI pieces for Guy's 15 picks: rating chip, no-price dash, thin-market "!", sort menu/header, Net worth period picker, saved-list row buttons, Megalo click cycle, back link, filter box + Clear search, Ctrl+Space drag, plain labels, fold header, shared item rows, "Remove" verb, mod hover card. Building. Picks: https://claude.ai/artifact/YVXzJ8BPQfbqgpQdvePH9A
