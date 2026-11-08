---
id: WOKEPOET-151
title: B. Covens of Umbra league name and scarab views hidden from 3.30
status: Done
priority: High
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-08T09:53:45.081Z'
    comment: Created ticket.
    id: a-2026-11-08t09-53-45-081z
  - type: activity
    user: Agent
    date: '2026-11-08T09:53:45.081Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-08t09-53-45-081z
  - type: activity
    user: Agent
    date: '2026-11-08T10:03:01.278Z'
    comment: >-
      League names need no code: they load from GGG's league API. Flips now
      shows only families poe.ninja prices in the picked league
      (pricedFamilies/shownFamily in scarab-flip/families.ts), so the Scarabs
      tab goes away in 3.30. In PR #266, waiting on the cloud merge.
    id: a-2026-11-08t10-03-01-278z
  - type: comment
    user: Agent
    comment: >-
      **Flips hides families with no poe.ninja prices, so Scarabs goes away in
      3.30.** In PR https://github.com/guybnd/woke-poe-trade/pull/266, with
      tests. Local checks pass. Waiting on the cloud merge.
    date: '2026-11-08T10:03:04.550Z'
    completionComment: true
    id: c-2026-11-08t10-03-04-550z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-08T10:03:04.550Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 5c41c62. Flips only shows families poe.ninja prices in the
      picked league, so the Scarabs tab goes away in 3.30. It's live in the dev
      build. No docs needed.
    completionComment: true
    date: '2026-11-08T10:41:22.372Z'
    id: c-2026-11-08t10-41-22-372z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-08T10:41:22.634Z'
needsAction: null
baselineCommit: 4b4955af5e8527b5b62ac15c25b895bfe1dca024
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/266'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/loot-filter/parse.ts
    additions: 1
    deletions: 1
  - file: renderer/src/web/woke/scarab-flip/WidgetScarabFlip.vue
    additions: 4
    deletions: 3
  - file: renderer/src/web/woke/scarab-flip/families.ts
    additions: 15
    deletions: 0
  - file: renderer/test/woke/filter-parse.test.ts
    additions: 8
    deletions: 0
  - file: renderer/test/woke/flip-families.test.ts
    additions: 23
    deletions: 1
---
Add the league to `background/Leagues.ts` / `league-invest` and the migration watcher. Hide scarab flips, stash scarab reader, scarab filter groups and dock entries when the league is 3.30+ (keep for Standard/old leagues). Before launch.
