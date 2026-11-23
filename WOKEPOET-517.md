---
id: WOKEPOET-517
title: Onboarding audit for new users
status: Done
priority: None
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-23T14:10:23.664Z'
    comment: Created ticket.
    id: a-2026-11-23t14-10-23-664z
  - type: comment
    user: Agent
    comment: >-
      Findings + options A-D awaiting Guy's pick:
      https://claude.ai/artifact/SyMy2YNwq4wNajcRDiVbx1
    date: '2026-11-23T14:10:56.178Z'
    selfAttested: true
    pin: true
    id: c-2026-11-23t14-10-56-178z
  - type: activity
    user: Agent
    date: '2026-11-23T14:10:56.298Z'
    comment: Updated implementation link.
    id: a-2026-11-23t14-10-56-298z
  - type: comment
    user: Agent
    comment: 'Picks A, B, C plus starter pins built in PR 814; D not picked'
    date: '2026-11-23T15:12:22.333Z'
    completionComment: true
    id: c-2026-11-23t15-12-22-333z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-23T15:12:22.333Z'
  - type: comment
    user: Agent
    comment: >-
      Picks A, B, C plus starter pins built in PR 814; D not picked. Website
      part was PR 812. Dev build reloaded.
    completionComment: true
    date: '2026-11-23T15:12:39.448Z'
    id: c-2026-11-23t15-12-39-448z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-23T15:12:39.957Z'
  - type: comment
    user: Agent
    comment: >-
      Follow-up merged: https://github.com/guybnd/woke-poe-trade/pull/817 adds
      the What's new icon in the dock, with Show me and dismiss on each line.
    date: '2026-11-23T15:48:11.388Z'
    selfAttested: true
    id: c-2026-11-23t15-48-11-388z
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/814'
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
Website part: https://github.com/guybnd/woke-poe-trade/pull/812 (Quick Start rewrite, Net worth line on the Tools page).
