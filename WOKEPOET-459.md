---
id: WOKEPOET-459
title: 'Ctrl+Space Trade site: instant buyout, Foulborn filter, unique map URLs'
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T13:53:57.634Z'
    comment: Created ticket.
    id: a-2026-11-21t13-53-57-634z
  - type: comment
    user: Agent
    comment: >-
      Merged in PR 740: Trade site follows price check's listing setting,
      Foulborn filter, unique map discriminator. Adversarial review clean;
      checks green.
    date: '2026-11-21T14:13:54.614Z'
    completionComment: true
    id: c-2026-11-21t14-13-54-614z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T14:13:54.614Z'
  - type: comment
    user: Agent
    comment: >-
      Trade site (Ctrl+Space and item menu) follows price check's listing
      setting (instant buyout default), adds the Foulborn filter (true for
      Foulborn, false for plain uniques), and sends unique maps and the Map base
      with the "map" discriminator. Unit + e2e tests; reviewed; checks green.
    completionComment: true
    date: '2026-11-21T14:14:03.640Z'
    id: c-2026-11-21t14-14-03-640z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T14:14:04.356Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/740'
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
User report via Guy: Ctrl+Space "Trade site" (1) ignores Foulborn (plain uniques should exclude Foulborn copies), (2) always opens "In person (online)" instead of price check's instant buyout default, (3) "cortex" (unique map) opens a broken search. Same fix for the item menu's Trade button. Branch woke/ctrl-space-trade.
