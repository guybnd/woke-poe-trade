---
id: WOKEPOET-316
title: 'Character: mod tiers and roll % in build and character tooltips'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - pob
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-304
history:
  - type: activity
    user: Agent
    date: '2026-11-15T06:27:48.854Z'
    comment: Created ticket.
    id: a-2026-11-15t06-27-48-854z
  - type: activity
    user: Agent
    date: '2026-11-15T06:27:48.854Z'
    comment: Created as subtask of WOKEPOET-304.
    id: a-2026-11-15t06-27-48-854z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/512 (after #510),
      reviewed, sent to merge. Data from poedb 3.30 via npm run mod-tiers.
    date: '2026-11-15T07:12:44.212Z'
    selfAttested: true
    id: c-2026-11-15t07-12-44-212z
  - type: comment
    user: Agent
    comment: 'Mod tiers and rolls, merged in #512.'
    date: '2026-11-15T07:59:01.296Z'
    completionComment: true
    id: c-2026-11-15t07-59-01-296z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T07:59:01.296Z'
  - type: comment
    user: Agent
    comment: 'Merged in #512.'
    completionComment: true
    date: '2026-11-15T07:59:02.044Z'
    id: c-2026-11-15t07-59-02-044z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T07:59:02.373Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/512'
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
Follow-up to WOKEPOET-314. No tier data in the app (stats.ndjson has no tiers; affix caps read advanced copy text). Add a RePoE/poedb 3.30 mod-tier JSON under public/data (lazy-loaded, run bump-data-version), match PoB/character mod lines to tiers by stat text + item class + values, show "T3 · 82%" like the listing tooltip (layout J). Keep perf within budget.
