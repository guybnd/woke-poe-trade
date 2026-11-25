---
id: WOKEPOET-526
title: >-
  Dock: loot filter icon only when there's a change to apply; explain Net worth
  stale count
status: Released
priority: None
effort: S
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-24T02:39:58.455Z'
    comment: Created ticket.
    id: a-2026-11-24t02-39-58-455z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-24T02:40:03.383Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-24t02-40-03-383z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-24T02:40:03.383Z'
  - type: activity
    user: Agent
    date: '2026-11-24T02:44:21.049Z'
    comment: >-
      Pick page for Guy: https://claude.ai/artifact/FFs7AaEpduCCTrrHRJmN72 .
      Building A + N1 on branch dock-chips; CI check + adversarial review
      running.
    id: a-2026-11-24t02-44-21-049z
  - type: activity
    user: Event Horizon
    date: '2026-11-24T03:10:38.625Z'
    comment: Claim by claude-code@guy-pc expired (no heartbeat for 30 min)
    id: a-2026-11-24t03-10-38-625z
  - type: status_change
    from: In Progress
    to: Todo
    user: Event Horizon
    date: '2026-11-24T03:10:38.888Z'
  - type: comment
    user: Agent
    comment: 'PR 844 merged (671456cd), all checks green, adversarial review fixes in.'
    date: '2026-11-24T03:43:48.266Z'
    completionComment: true
    id: c-2026-11-24t03-43-48-266z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-24T03:43:48.266Z'
  - type: comment
    user: Agent
    comment: >-
      Merged PR 844: loot filter icon shows while playing only with a reload or
      note waiting (overlay open or pinned keeps it; no strictness chip). Net
      worth stale count only in hideout, card line with Show (Listed on Stale)
      and Hide (until another listing goes stale). Guy's pick on the mockups
      still pending.
    completionComment: true
    date: '2026-11-24T03:43:51.905Z'
    id: c-2026-11-24t03-43-51-905z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T03:43:52.963Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:57.612Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/844'
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
version: 1.30.20
releasedAt: '2026-11-25T04:05:49.382Z'
releaseDocPath: release-notes/1.30.20
---
Guy: the VS chip (loot filter strictness) shouldn't always show; only when there are filter changes to apply. Also asked what the 18 on the Net worth icon counts (stale Faustus listings, 3+ days unsold).

Mockups: https://claude.ai/artifact/FFs7AaEpduCCTrrHRJmN72 . Building recommended A (loot filter hidden while playing unless reload waiting or a note needs you; shows with overlay open; no strictness chip) + N1 (stale count in hideout only, card line names it with Show → Listed/Stale). Guy's pick pending.
