---
id: WOKEPOET-561
title: Related items in price check
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
  - epic
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-24T10:51:09.108Z'
    comment: Created ticket.
    id: a-2026-11-24t10-51-09-108z
  - type: activity
    user: Agent
    date: '2026-11-24T11:09:14.248Z'
    comment: Updated implementation link.
    id: a-2026-11-24t11-09-14-248z
  - type: comment
    user: Agent
    comment: PR 875 merged (8d0b1ee); all six parts shipped.
    date: '2026-11-24T12:16:01.290Z'
    completionComment: true
    id: c-2026-11-24t12-16-01-290z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T12:16:01.290Z'
  - type: comment
    user: Agent
    comment: >-
      PR 875 merged at 8d0b1ee; dev build reloaded. All six related-item parts
      shipped.
    completionComment: true
    date: '2026-11-24T12:16:03.502Z'
    id: c-2026-11-24t12-16-03-502z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T12:16:04.069Z'
subtasks:
  - WOKEPOET-562
  - WOKEPOET-563
  - WOKEPOET-564
  - WOKEPOET-565
  - WOKEPOET-566
  - WOKEPOET-567
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/875'
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
Epic: price check shows items related to the one being checked, with prices. Follows WOKEPOET-560 (recipe parts, PR 873).

Guy picked all six parts in the mockup: https://claude.ai/artifact/N82j4g5XbvTdrZzYKT7bBR. The "Show recipe rings in price check" thread is building them as one follow-up PR.
