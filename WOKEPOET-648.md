---
id: WOKEPOET-648
title: 'Ctrl+Space: search uniques by their mods (Foulborn, Vestigial)'
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
    date: '2026-11-26T14:22:57.607Z'
    comment: Created ticket.
    id: a-2026-11-26t14-22-57-607z
  - type: activity
    user: Agent
    date: '2026-11-26T14:23:00.153Z'
    comment: Updated implementation link.
    id: a-2026-11-26t14-23-00-153z
  - type: comment
    user: Agent
    comment: >-
      Waiting on Guy's layout pick:
      https://claude.ai/artifact/1ys2vRefokCxnseX7CRC3f
    date: '2026-11-26T14:23:01.352Z'
    selfAttested: true
    pin: true
    id: c-2026-11-26t14-23-01-352z
  - type: comment
    user: Agent
    comment: >-
      PR 974 merged (721efd0). Follow-ups (numbers in query, passive tree, div
      cards) in progress in the same thread.
    date: '2026-11-26T14:39:15.750Z'
    completionComment: true
    id: c-2026-11-26t14-39-15-750z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-26T14:39:15.750Z'
  - type: comment
    user: Agent
    comment: Merged at 721efd0; dev build reloaded.
    completionComment: true
    date: '2026-11-26T14:39:19.285Z'
    id: c-2026-11-26t14-39-19-285z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-26T14:39:19.988Z'
  - type: comment
    user: Agent
    comment: >-
      Done: follow-ups in PR 975
      (https://github.com/guybnd/woke-poe-trade/pull/975, e4b137f): least roll
      in mod search, passives by what they do, cards for corrupted rewards.
    date: '2026-11-26T14:56:37.704Z'
    selfAttested: true
    id: c-2026-11-26t14-56-37-704z
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/974'
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
Ctrl+Space search finds uniques by their mods, including Foulborn and Vestigial. PR: https://github.com/guybnd/woke-poe-trade/pull/974
