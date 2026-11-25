---
id: WOKEPOET-512
title: Stop fake div card prices in Net worth (Rain Tempter)
status: Released
priority: None
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-23T08:28:15.259Z'
    comment: Created ticket.
    id: a-2026-11-23t08-28-15-259z
  - type: comment
    user: Agent
    comment: Merged at 8b8348e0 from a cloud thread; dev build reloaded onto it.
    completionComment: true
    date: '2026-11-23T08:28:18.001Z'
    id: c-2026-11-23t08-28-18-001z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-23T08:28:18.504Z'
  - type: activity
    user: Agent
    date: '2026-11-23T09:00:26.952Z'
    comment: Updated title. Updated implementation link.
    id: a-2026-11-23t09-00-26-952z
  - type: comment
    user: Agent
    comment: >-
      Shipped in two PRs: https://github.com/guybnd/woke-poe-trade/pull/796
      (8b8348e0) counts poe.ninja spikes at the week's usual price, and
      https://github.com/guybnd/woke-poe-trade/pull/797 (3241f4df) checks spikes
      against the app's own saved daily prices (Rain Tempter at 98 div). Dev
      build reloaded on 3241f4df.
    date: '2026-11-23T09:00:28.496Z'
    selfAttested: true
    id: c-2026-11-23t09-00-28-496z
  - type: comment
    user: Agent
    comment: >-
      Also https://github.com/guybnd/woke-poe-trade/pull/798 (fdddbccf): the Net
      worth chart takes out price glitches that last several refreshes. Dev
      build reloaded on fdddbccf.
    date: '2026-11-23T09:22:24.126Z'
    selfAttested: true
    id: c-2026-11-23t09-22-24-126z
  - type: comment
    user: Agent
    comment: >-
      Also https://github.com/guybnd/woke-poe-trade/pull/800 (6631c269): the Net
      worth chart's 7D/24H views no longer carry a glitched value past the
      glitch's end (plateau fix). Dev build reloaded on 6631c269.
    date: '2026-11-23T11:00:07.412Z'
    selfAttested: true
    id: c-2026-11-23t11-00-07-412z
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:06:04.897Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/797'
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
version: 1.30.20
releasedAt: '2026-11-25T04:05:49.382Z'
releaseDocPath: release-notes/1.30.20
---
Done in a cloud thread: https://github.com/guybnd/woke-poe-trade/pull/796 (merged at 8b8348e0).
