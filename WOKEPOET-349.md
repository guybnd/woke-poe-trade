---
id: WOKEPOET-349
title: Loot filter undo history out of the settings file
status: Done
priority: High
effort: None
assignee: unassigned
tags:
  - perf
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-17T06:53:48.555Z'
    comment: Created ticket.
    id: a-2026-11-17t06-53-48-555z
  - type: comment
    user: Agent
    comment: >-
      Merged as 7b244470. On Guy's config, config.json goes from 1.1 MB to 50
      KB, and the overlay-close freeze is gone. The history lives in
      woke-docs/loot-filter/history.json and migrates on first start. The Gear
      thread is checking the migration on the dev build.
    completionComment: true
    date: '2026-11-17T06:53:53.113Z'
    id: c-2026-11-17t06-53-53-113z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-17T06:53:53.560Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/566'
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
Follow-up to WOKEPOET-346. config.json had grown to 1.1 MB (97% of it the loot filter timeline and history). Moved to woke-docs/loot-filter/history.json with a migration; timeline capped at 500 KB.
