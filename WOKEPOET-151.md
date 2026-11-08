---
id: WOKEPOET-151
title: B. Covens of Umbra league name and scarab views hidden from 3.30
status: Ready
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
needsAction: null
---
Add the league to `background/Leagues.ts` / `league-invest` and the migration watcher. Hide scarab flips, stash scarab reader, scarab filter groups and dock entries when the league is 3.30+ (keep for Standard/old leagues). Before launch.
