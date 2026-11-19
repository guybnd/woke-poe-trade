---
id: WOKEPOET-398
title: Ctrl+Space notable card shows its anoint oils
status: Ready
priority: None
effort: S
assignee: unassigned
tags:
  - woke
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-19T08:56:15.780Z'
    comment: Created ticket.
    id: a-2026-11-19t08-56-15-780z
  - type: activity
    user: Agent
    date: '2026-11-19T09:04:25.587Z'
    comment: >-
      A built on woke/notable-oils (pushed). Mocks A/B/C await Guy's pick:
      https://claude.ai/artifact/U2cPreaGw48CME7xNWj8oU . Unit tests, typecheck,
      lint pass; adversarial review running.
    id: a-2026-11-19t09-04-25-587z
  - type: activity
    user: Agent
    date: '2026-11-19T09:10:01.555Z'
    comment: Updated implementation link.
    id: a-2026-11-19t09-10-01-555z
  - type: comment
    user: Agent
    comment: >-
      PR #655: Anoint section (layout A) on Ctrl+Space notable cards. Review
      fixes in; typecheck, lint, unit tests pass. Handed to coordinator for
      merge. Guy's A/B/C pick still open:
      https://claude.ai/artifact/U2cPreaGw48CME7xNWj8oU
    date: '2026-11-19T09:10:03.396Z'
    completionComment: true
    id: c-2026-11-19t09-10-03-396z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-19T09:10:03.396Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/655'
needsAction: null
---
Guy wants the Ctrl+Space passive notable detail pane (e.g. Sione's Ambition) to show the three oils that anoint it, with oil icons in PoE style. Only anointable notables.

Data: stats.ndjson "Allocates <notable>" anointments (oil indices, game data). Verified Acrimony (Clear, Black, Black) and Acuity (Clear, Violet, Black) against poedb.

Branch woke/notable-oils, worktree E:\Git\woke\wt\notable-oils.
