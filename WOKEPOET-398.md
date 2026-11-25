---
id: WOKEPOET-398
title: Ctrl+Space notable card shows its anoint oils
status: Released
priority: None
effort: S
assignee: unassigned
tags:
  - woke
createdBy: Agent
updatedBy: Guy
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
  - type: comment
    user: Agent
    comment: >-
      Merged as 19fd1656. Ctrl+Space notable cards show the three anoint oils
      with art, prices and total (layout A). Guy's A/B/C pick still open on the
      mock page.
    completionComment: true
    date: '2026-11-19T09:14:08.248Z'
    id: c-2026-11-19t09-14-08-248z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-19T09:14:08.694Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:51.359Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/655'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
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
Guy wants the Ctrl+Space passive notable detail pane (e.g. Sione's Ambition) to show the three oils that anoint it, with oil icons in PoE style. Only anointable notables.

Data: stats.ndjson "Allocates <notable>" anointments (oil indices, game data). Verified Acrimony (Clear, Black, Black) and Acuity (Clear, Violet, Black) against poedb.

Branch woke/notable-oils, worktree E:\Git\woke\wt\notable-oils.
