---
id: WOKEPOET-379
title: 'Price check mod row right-click menu: grouped, Fractured only on any mod'
status: Released
priority: Medium
effort: M
assignee: Agent
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-18T14:31:09.457Z'
    comment: Created ticket.
    id: a-2026-11-18t14-31-09-457z
  - type: activity
    user: Agent
    date: '2026-11-18T14:31:13.922Z'
    comment: Updated implementation link.
    id: a-2026-11-18t14-31-13-922z
  - type: activity
    user: Agent
    date: '2026-11-18T14:31:15.511Z'
    comment: >-
      Built and reviewed on woke/mod-row-menu (e66d9b99). Adversarial review: 5
      findings fixed. Local checks: vue-tsc, eslint, vitest 4,586 pass, vite
      build OK. Handed to coordinator for merge. Untried in the live overlay.
      Guy's mock picks not saved yet (asked in thread).
    id: a-2026-11-18t14-31-15-511z
  - type: comment
    user: Agent
    comment: >-
      Merged as PR #628 (9e9f2ab0): grouped right-click menu, Fractured only on
      any explicit mod, 10% looser bound, stash search copy, Ctrl+Click search
      only this, menu closes when its panel goes away.
    date: '2026-11-18T15:36:58.700Z'
    completionComment: true
    id: c-2026-11-18t15-36-58-700z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T15:36:58.700Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as #628 (9e9f2ab0). Guy's extra picks (next tier up, all tiers,
      always/never tick, Alt+Click exclude) follow on branch
      woke/mod-menu-extras.
    completionComment: true
    date: '2026-11-18T15:37:04.619Z'
    id: c-2026-11-18t15-37-04-619z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T15:37:04.988Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:57.304Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/628'
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
version: '00002'
releasedAt: '2026-11-25T11:52:41.308Z'
releaseDocPath: release-notes/00002
---
Guy asked (2026-11-18) for a better right-click menu on price check mod rows, e.g. Fractured only on any mod, and ideas.

Mocks + idea list with picks: https://claude.ai/artifact/A23iFZEDZdvc8MKFY6hVPt (B recommended and built; Guy's saved picks still pending).

Branch `woke/mod-row-menu` (worktree E:\Git\woke\wt\mod-menu):
- Menu grouped under Search / Min / Price as / Copy headings, ✓ on on/off lines
- Fractured only on any explicit mod; on one-mod totals via split
- 10% under/over my roll; Copy stash search; Ctrl+Click tick box = Search only this
- Harvest swaps skip fractured-only rows
- Menu closes when its panel is dismissed or the overlay hides (Guy's stuck-menu report)

Unbuilt candidates awaiting picks: next tier up min, always/never tick per mod, Alt+Click exclude, crafted only, show all tiers.
