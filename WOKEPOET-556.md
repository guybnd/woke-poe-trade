---
id: WOKEPOET-556
title: Mercenary Warrant support ladder
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-24T07:24:57.568Z'
    comment: Created ticket.
    id: a-2026-11-24t07-24-57-568z
  - type: activity
    user: Agent
    date: '2026-11-24T07:25:04.600Z'
    comment: Updated implementation link.
    id: a-2026-11-24t07-25-04-600z
  - type: activity
    user: Agent
    date: '2026-11-24T12:16:35.209Z'
    comment: >-
      Archived the auto-made duplicate PR-864; this ticket is the one for PR 864
      (open as of 2026-11-24 12:16Z).
    id: a-2026-11-24t12-16-35-209z
  - type: comment
    user: Agent
    comment: >-
      PR 864 merged (93b37f5). The in-map merc panel reader is still waiting on
      Guy's screenshot (not part of this PR).
    date: '2026-11-24T12:33:13.537Z'
    completionComment: true
    id: c-2026-11-24t12-33-13-537z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T12:33:13.537Z'
  - type: comment
    user: Agent
    comment: >-
      Merged at 93b37f5; dev build reloaded. In-map merc panel reader still
      waits on Guy's screenshot.
    completionComment: true
    date: '2026-11-24T12:33:16.853Z'
    id: c-2026-11-24t12-33-16-853z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T12:33:17.404Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/864'
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
---
The price check ranks a Mercenary Warrant's supports by what buyers pay: a live search plus a local ledger. PR: https://github.com/guybnd/woke-poe-trade/pull/864

The in-map reader is still waiting on a merc panel screenshot from Guy.
