---
id: WOKEPOET-574
title: Shared profit line item
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
    date: '2026-11-24T13:47:29.263Z'
    comment: Created ticket.
    id: a-2026-11-24t13-47-29-263z
  - type: activity
    user: Agent
    date: '2026-11-24T13:47:34.913Z'
    comment: Updated implementation link.
    id: a-2026-11-24t13-47-34-913z
  - type: comment
    user: Agent
    comment: >-
      Phase 1 done in PR 861 (merged a69de49): Runs + Holdings rows, Changed
      chip. Phases 2 and 3 still to come.
    date: '2026-11-24T13:47:36.029Z'
    selfAttested: true
    pin: true
    id: c-2026-11-24t13-47-36-029z
  - type: comment
    user: Agent
    comment: >-
      Phase 2 done in PR 884 (https://github.com/guybnd/woke-poe-trade/pull/884,
      merged fe4d95a): stacked decks, run summary, Session analytics. Phase 3
      still to come.
    date: '2026-11-24T14:41:55.984Z'
    selfAttested: true
    pin: true
    id: c-2026-11-24t14-41-55-984z
  - type: comment
    user: Agent
    comment: >-
      Phase 3 done in PR 888 (https://github.com/guybnd/woke-poe-trade/pull/888,
      merged 7f1e37b): Sales, Listed, Farming. All phases: PRs 861, 884, 888.
      Note: left-out listings still count in Holdings, the dock badge and
      Ctrl+Space.
    date: '2026-11-24T15:03:50.032Z'
    selfAttested: true
    pin: true
    id: c-2026-11-24t15-03-50-032z
  - type: comment
    user: Agent
    comment: 'All three phases merged (PRs 861, 884, 888).'
    date: '2026-11-24T15:03:51.755Z'
    completionComment: true
    id: c-2026-11-24t15-03-51-755z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T15:03:51.755Z'
  - type: comment
    user: Agent
    comment: >-
      Done across PRs 861, 884 and 888 (final 7f1e37b); dev build reloaded.
      Left-out listings still count in Holdings, the dock badge and Ctrl+Space.
    completionComment: true
    date: '2026-11-24T15:03:55.234Z'
    id: c-2026-11-24t15-03-55-234z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T15:03:57.429Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/888'
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
One shared profit line item for Runs and Holdings rows. Phase 1 (Runs + Holdings rows, Changed chip) shipped in PR https://github.com/guybnd/woke-poe-trade/pull/861. Phases 2 and 3 to come.
