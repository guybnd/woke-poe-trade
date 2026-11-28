---
id: WOKEPOET-722
title: Alt+F on a magic Crimson Jewel shows the unique jewel card
status: Done
priority: High
effort: None
assignee: unassigned
tags:
  - loot-filter
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-28T09:58:08.420Z'
    comment: Created ticket.
    id: a-2026-11-28t09-58-08-420z
  - type: comment
    user: Agent
    comment: >-
      PR 1092 merged: Alt+F picks the jewel's own Loot row, never the unique of
      its base.
    date: '2026-11-28T10:09:01.958Z'
    completionComment: true
    id: c-2026-11-28t10-09-01-958z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-28T10:09:01.958Z'
  - type: comment
    user: Agent
    comment: >-
      Alt+F card picks a jewel's own Loot row (itemFor matches row bts; a
      uniques row is never picked for a non-unique item; one-base row wins
      ties). Checked against Guy's live filter for plain and abyss jewels of
      every rarity.
    completionComment: true
    date: '2026-11-28T10:09:06.355Z'
    id: c-2026-11-28t10-09-06-355z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T10:09:07.074Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1092'
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
Guy 2026-11-28: Alt+F on a magic "Parrying Crimson Jewel of Spirit" showed the unique Crimson Jewel card. Cause: jewel rows' `bt` names only Cobalt Jewel, so `itemFor` fell back to the unique base row. Fix: match rows by `bts`, never pick a uniques row for a non-unique item. PR https://github.com/guybnd/woke-poe-trade/pull/1092
