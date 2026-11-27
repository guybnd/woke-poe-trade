---
id: WOKEPOET-623
title: 'Deep audit: Consolidate duplicated code'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - refactor
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-621
history:
  - type: activity
    user: Agent
    date: '2026-11-26T01:37:49.588Z'
    comment: Created ticket.
    id: a-2026-11-26t01-37-49-588z
  - type: activity
    user: Agent
    date: '2026-11-26T01:37:49.588Z'
    comment: Created as subtask of WOKEPOET-621.
    id: a-2026-11-26t01-37-49-588z
  - type: activity
    user: Agent
    date: '2026-11-26T01:37:57.673Z'
    comment: Updated implementation link.
    id: a-2026-11-26t01-37-57-673z
  - type: comment
    user: Agent
    comment: >-
      Consolidation batch 2 done: PR 947
      (https://github.com/guybnd/woke-poe-trade/pull/947, merged 54ca81b): same
      look across windows for signs, clock, durations, divine rate, folder menu
      and drag.
    date: '2026-11-27T04:51:06.215Z'
    selfAttested: true
    id: c-2026-11-27t04-51-06-215z
  - type: comment
    user: Agent
    comment: >-
      Consolidation done across PRs 945 and 947. Risky leftovers filed
      separately.
    date: '2026-11-27T04:51:40.675Z'
    completionComment: true
    id: c-2026-11-27t04-51-40-675z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-27T04:51:40.675Z'
  - type: comment
    user: Agent
    comment: >-
      Done across PRs 945 and 947 (final 54ca81b). Risky leftovers in
      WOKEPOET-654.
    completionComment: true
    date: '2026-11-27T04:51:49.261Z'
    id: c-2026-11-27t04-51-49-261z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-27T04:51:49.708Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:09:53.424Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/947'
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
version: '000012'
releasedAt: '2026-11-27T16:09:47.375Z'
releaseDocPath: release-notes/000012
---
Consolidate duplicated code. Picks: https://claude.ai/artifact/1cpiDKsuoqisy4TNFh6eDo. First PR: https://github.com/guybnd/woke-poe-trade/pull/945 (merged bc566ef: shared saved-setting, median, seeded random and day-key helpers).
