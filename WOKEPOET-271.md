---
id: WOKEPOET-271
title: 'Run timer: per-run zone and level timeline with review view'
status: Ready
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
needsAction: null
---
Guy wants each campaign run to save a full timeline he can review afterwards.

Plan: record zone entries (areaId, name, run time), level-ups and deaths per run from Client.txt, in its own file per run under userData (woke-run-timeline/<id>.json), loaded only when viewed. Review view opens from Run timer > Past runs.

Mocks: https://claude.ai/artifact/QhBzT9EB4qPjFiNYsTGVJL (A zone log, B act strips, C versus, recommended). Pick saves to artifact db picks/current. Building C meanwhile.

Open: campaign step times, rebuilding old runs from Client.txt.
