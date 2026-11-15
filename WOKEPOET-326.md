---
id: WOKEPOET-326
title: 'Character tab: Open in PoB opens your character''s own build'
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
    date: '2026-11-15T13:47:19.528Z'
    comment: Created ticket.
    id: a-2026-11-15t13-47-19-528z
  - type: comment
    user: Agent
    comment: 'Merged in PR #534 (d1bdc3bf). The dev overlay was reloaded on master.'
    date: '2026-11-15T13:47:24.080Z'
    completionComment: true
    id: c-2026-11-15t13-47-24-080z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T13:47:24.080Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as d1bdc3bf: in the Character tab, Open in PoB opens your
      character's own build.
    completionComment: true
    date: '2026-11-15T13:47:29.018Z'
    id: c-2026-11-15t13-47-29-018z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T13:47:29.447Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/534'
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
> **TL;DR:** In the Character tab, Open in PoB now opens your character's own build. Built and merged in PR #534 (d1bdc3bf); this ticket records it.
