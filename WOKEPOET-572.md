---
id: WOKEPOET-572
title: 'Valdo maps: skip listings with mods your build can''t run'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-24T13:00:41.298Z'
    comment: Created ticket.
    id: a-2026-11-24t13-00-41-298z
  - type: activity
    user: Agent
    date: '2026-11-24T13:00:45.536Z'
    comment: Updated implementation link.
    id: a-2026-11-24t13-00-45-536z
  - type: comment
    user: Agent
    comment: 'Guy''s picks are open: https://claude.ai/artifact/AcYCHD4amB2MTEK8oWpXS7'
    date: '2026-11-24T13:00:46.575Z'
    selfAttested: true
    id: c-2026-11-24t13-00-46-575z
  - type: comment
    user: Agent
    comment: PR 881 merged (f2e01fc).
    date: '2026-11-24T17:08:52.345Z'
    completionComment: true
    id: c-2026-11-24t17-08-52-345z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T17:08:52.345Z'
  - type: comment
    user: Agent
    comment: Merged at f2e01fc; dev build reloaded.
    completionComment: true
    date: '2026-11-24T17:08:57.049Z'
    id: c-2026-11-24t17-08-57-049z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T17:08:57.490Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/881'
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
Valdo map searches skip listings whose mods the build can't run. PR: https://github.com/guybnd/woke-poe-trade/pull/881
