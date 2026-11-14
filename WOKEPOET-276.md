---
id: WOKEPOET-276
title: 'PoB tree follows passive points, not just its title'
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - pob
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T04:15:56.311Z'
    comment: Created ticket.
    id: a-2026-11-14t04-15-56-311z
  - type: comment
    user: Agent
    comment: >-
      PR #437 merged as 0eb052b7: the tree follows estimated passive points;
      settings editors lazy-loaded (startup JS 1466 KB).
    date: '2026-11-14T04:29:52.954Z'
    completionComment: true
    id: c-2026-11-14t04-29-52-954z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-14T04:29:52.955Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 0eb052b7. Not tried in game; open: lab backtrack to an earlier
      act can step the tree back while there.
    completionComment: true
    date: '2026-11-14T04:29:58.645Z'
    id: c-2026-11-14t04-29-58-645z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-14T04:29:59.346Z'
needsAction: null
baselineCommit: 180ce79856ea465a4ff92164b43dd6852169f75e
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/437'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/campaign/route-parse.ts
    additions: 26
    deletions: 1
  - file: renderer/test/woke/campaign-town-jump.test.ts
    additions: 36
    deletions: 0
---
Guy (2026-11-14): at level 39, auto still shows the Level 33 tree. Does it count quest passives?

Cause: the tree in use went by title only. Fix in PR https://github.com/guybnd/woke-poe-trade/pull/437: points = level − 1 + quest rewards from earlier acts (Bandits left out), conservative cost; Next/pins/hover card step from the title's tree. Open: going back to an earlier act's zone for a lab can step the tree back for the time you're there. Not tried in game.
