---
id: WOKEPOET-271
title: 'Run timer: per-run zone and level timeline with review view'
status: Done
priority: None
effort: M
assignee: unassigned
tags:
  - campaign
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T02:49:25.550Z'
    comment: Created ticket.
    id: a-2026-11-14t02-49-25-550z
  - type: comment
    user: Agent
    comment: >-
      PR #432 (https://github.com/guybnd/woke-poe-trade/pull/432), branch
      woke/run-timeline, clone E:\Git\woke-run-timeline. Builds option C.
      Adversarial review found 3 bugs, all fixed. Typecheck, lint, vitest, vite
      build, and e2e (run-timeline + campaign) all pass. Open: Guy's pick on the
      mocks page (artifact db picks/current), campaign step times, rebuilding
      old runs.
    date: '2026-11-14T03:11:38.024Z'
    completionComment: true
    id: c-2026-11-14t03-11-38-024z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-14T03:11:38.024Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as eaaa17a0. Each run saves its zones, level-ups and deaths, and
      you review them under Past runs (option C). Still open: Guy's layout pick
      on the mocks page, a live overlay check, campaign step times, and
      rebuilding old runs.
    completionComment: true
    date: '2026-11-14T03:31:20.905Z'
    id: c-2026-11-14t03-31-20-905z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-14T03:31:21.404Z'
needsAction: null
baselineCommit: 407ba7f1f2c478fed465d0b71f60be15ccdb1be0
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/432'
swimlane: null
diffSummary:
  - file: testing/e2e/loot-filter.spec.ts
    additions: 1
    deletions: 1
---
Guy wants each campaign run to save a full timeline he can review afterwards.

Plan: record zone entries (areaId, name, run time), level-ups and deaths per run from Client.txt, in its own file per run under userData (woke-run-timeline/<id>.json), loaded only when viewed. Review view opens from Run timer > Past runs.

Mocks: https://claude.ai/artifact/QhBzT9EB4qPjFiNYsTGVJL (A zone log, B act strips, C versus, recommended). Pick saves to artifact db picks/current. Building C meanwhile.

Open: campaign step times, rebuilding old runs from Client.txt.
