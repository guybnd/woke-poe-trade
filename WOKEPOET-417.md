---
id: WOKEPOET-417
title: 'Session story: night strip card when you stop playing'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-20T14:24:39.362Z'
    comment: Created ticket.
    id: a-2026-11-20t14-24-39-362z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-20T14:35:30.464Z'
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/683: Session story module
      (night strip, dock, Ctrl+Space "tonight"). Bug review fixes in; cloud
      checks green. Sent to the merge thread.
    date: '2026-11-20T15:03:25.131Z'
    completionComment: true
    id: c-2026-11-20t15-03-25-131z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-20T15:03:25.131Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 377616fb. Session story module: night strip card, dock icon,
      Ctrl+Space "tonight", nights saved in woke-docs/session-story.
    completionComment: true
    date: '2026-11-20T15:04:16.171Z'
    id: c-2026-11-20t15-04-16-171z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T15:04:16.649Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:45.774Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/683'
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
version: '00002'
releasedAt: '2026-11-25T11:52:41.308Z'
releaseDocPath: release-notes/00002
---
Guy asked to build it (2026-11-20). Mock: https://claude.ai/artifact/C69uz3mGDDWMSQ68RTKcSp option story-B (night strip): one block per map shaded by profit, hideout gaps striped, death ticks, best drop star, totals row (profit, per hour, hideout, deaths). Ctrl+Space "tonight" card.

Data: Farming SessionRecord/LiveRun (mapMs, otherMs, loot), Net worth stash change over the session, death log from Client.txt.
Trigger: Client.txt has no logout line (checked in the real log). Show when the game closes, when the Farming session ends, or after 15 min with no zone change. Never over play.
