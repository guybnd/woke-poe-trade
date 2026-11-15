---
id: WOKEPOET-325
title: 'Loot filter card: hotkeys behind a ? tip'
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
    date: '2026-11-15T13:27:52.815Z'
    comment: Created ticket.
    id: a-2026-11-15t13-27-52-815z
  - type: comment
    user: Agent
    comment: 'Merged in PR #532 (d1893d6d). The dev overlay was reloaded on master.'
    date: '2026-11-15T13:27:59.555Z'
    completionComment: true
    id: c-2026-11-15t13-27-59-555z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T13:27:59.555Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as d1893d6d: the loot filter card's hotkeys sit behind a ? on the
      strictness row.
    completionComment: true
    date: '2026-11-15T13:28:06.169Z'
    id: c-2026-11-15t13-28-06-169z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T13:28:06.577Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/532'
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
> **TL;DR:** The loot filter card's hotkeys now sit behind a ? on the strictness row. Built and merged in PR #532 (d1893d6d); this ticket records it.
