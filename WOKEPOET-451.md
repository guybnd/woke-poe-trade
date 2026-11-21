---
id: WOKEPOET-451
title: 'Vault hover: card with an icon and price per reward'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T10:24:17.708Z'
    comment: Created ticket.
    id: a-2026-11-21t10-24-17-708z
  - type: comment
    user: Agent
    comment: 'PR 725 reviewed (stuck-card fix applied), CI green, merged as 6dfd30ea.'
    date: '2026-11-21T10:32:11.862Z'
    completionComment: true
    id: c-2026-11-21t10-32-11-862z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T10:32:11.862Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 6dfd30ea, dev build reloaded: vault hover is a card with a row
      per reward (icon, full name, price). Option A of the mockups; Guy hasn't
      picked yet.
    completionComment: true
    date: '2026-11-21T10:32:13.314Z'
    id: c-2026-11-21t10-32-13-314z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T10:32:13.930Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/725'
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
Guy: the Nightmare vault tag hover should show full lines with icons, wider if needed. Mockups: https://claude.ai/artifact/FY397Hchc4voZqAYDqFYty (building A). PR: https://github.com/guybnd/woke-poe-trade/pull/725
