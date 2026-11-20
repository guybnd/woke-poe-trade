---
id: WOKEPOET-414
title: 'Net worth per hour: skip hideout time, show last 1/2/3 h'
status: Done
priority: None
effort: M
assignee: unassigned
tags:
  - net-worth
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T10:28:16.619Z'
    comment: Created ticket.
    id: a-2026-11-20t10-28-16-619z
  - type: activity
    user: Agent
    date: '2026-11-20T10:34:06.707Z'
    comment: >-
      Option A built on woke/networth-active-hour (commit 6baf1665-ish,
      amended). Mocks/pick: https://claude.ai/artifact/4AMW4gkqA9KvuwhxgF78hH —
      question to Guy in the project thread. Review + CI running.
    id: a-2026-11-20t10-34-06-707z
  - type: activity
    user: Agent
    date: '2026-11-20T10:46:50.652Z'
    comment: Updated implementation link.
    id: a-2026-11-20t10-46-50-652z
  - type: comment
    user: Agent
    comment: >-
      Merged as #675 (7540d5ea). Dev build reloaded on master. Not yet tried in
      game.
    date: '2026-11-20T10:53:37.233Z'
    completionComment: true
    id: c-2026-11-20t10-53-37-233z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-20T10:53:37.233Z'
  - type: comment
    user: Agent
    comment: >-
      Net worth per hour now counts only play time and shows the last 1, 2 and 3
      hours, with the same numbers in Ctrl+Space. Merged as #675, and the dev
      build is reloaded.
    completionComment: true
    date: '2026-11-20T10:53:41.450Z'
    id: c-2026-11-20t10-53-41-450z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T10:53:41.905Z'
  - type: comment
    user: Agent
    comment: >-
      Follow-ups merged and live in the dev build: #676 added per hour to the
      hover card. #678 added Guy's C1: a window picker, a "Leave out hideout
      time" toggle, the map/hideout split, average map time, and the card picker
      plus graph.
    date: '2026-11-20T12:07:54.877Z'
    selfAttested: true
    id: c-2026-11-20t12-07-54-877z
  - type: comment
    user: Agent
    comment: >-
      #680 merged and live in the dev build. It adds the card chart with hover,
      window layout C with resizable sections, and median map time.
    date: '2026-11-20T12:41:37.317Z'
    selfAttested: true
    id: c-2026-11-20t12-41-37-317z
  - type: comment
    user: Agent
    comment: >-
      #682 merged; master is on the dev build. The window layout is the version
      Guy approved ("looks good"): the chart beside the per hour box, lighter
      controls, and item icons.
    date: '2026-11-20T14:05:36.233Z'
    selfAttested: true
    id: c-2026-11-20t14-05-36-233z
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/675'
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
Guy (2026-11-20): net worth profit per hour should leave out time in hideout/town, and show rolling last 1, 2 and 3 hour windows.

Plan: rate = sum of per-refresh net gains (ledger points' netChaos) in the window ÷ play time, where play time = span minus town-like time read on demand from Client.txt via the existing `game-log-range` op (isTownLike). No always-on tracker. Same numbers in Ctrl+Space.

Mocks: https://claude.ai/artifact/4AMW4gkqA9KvuwhxgF78hH (A recommended, building A meanwhile). Branch woke/networth-active-hour, worktree E:\Git\woke\wt\networth-hour.
