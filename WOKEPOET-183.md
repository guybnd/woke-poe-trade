---
id: WOKEPOET-183
title: 'UI 3: roll the game look out panel by panel'
status: Done
priority: Medium
effort: XL
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-169
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:18.850Z'
    comment: Created ticket.
    id: a-2026-11-10t02-56-18-850z
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:18.850Z'
    comment: Created as subtask of WOKEPOET-169.
    id: a-2026-11-10t02-56-18-850z
  - type: activity
    user: Agent
    date: '2026-11-10T05:09:55.831Z'
    comment: Updated description.
    id: a-2026-11-10t05-09-55-831z
  - type: status_change
    from: Grooming
    to: Todo
    user: Agent
    date: '2026-11-10T05:09:58.187Z'
  - type: activity
    user: claude-code@GUY-PC
    date: '2026-11-10T05:11:33.957Z'
    comment: Claimed by claude-code@GUY-PC
    id: a-2026-11-10t05-11-33-957z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@GUY-PC
    date: '2026-11-10T05:11:33.957Z'
  - type: activity
    user: Event Horizon
    date: '2026-11-10T05:41:52.944Z'
    comment: Claim by claude-code@GUY-PC expired (no heartbeat for 30 min)
    id: a-2026-11-10t05-41-52-944z
  - type: status_change
    from: In Progress
    to: Todo
    user: Event Horizon
    date: '2026-11-10T05:41:53.042Z'
  - type: comment
    user: Agent
    comment: >-
      The rollout is merged in #297, #299 and #302, all on master and on the dev
      build. Mapping, campaign and lab, and builds needed nothing beyond the
      shared parts. The README covers the caps tokens, `.w-verdict` and
      `.w-corners`.
    date: '2026-11-10T06:17:39.230Z'
    completionComment: true
    id: c-2026-11-10t06-17-39-230z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-10T06:17:39.230Z'
  - type: comment
    user: Agent
    comment: >-
      Merged in #297 (Settings, verdict strips, dock cards, the leftover sizes
      under 11px), #299 (price check header, name switches Generic/Base, Vaal
      Orb chip) and #302 (caps labels). Live on the dev build. Docs:
      woke/ui/README.md.
    completionComment: true
    date: '2026-11-10T06:17:44.369Z'
    id: c-2026-11-10t06-17-44-369z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-10T06:17:44.785Z'
needsAction: null
baselineCommit: e67d6ec4dad47efdb249e0afdf27705a03528309
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/302'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/loot-filter/RuleBuilder.vue
    additions: 11
    deletions: 1
  - file: renderer/src/web/woke/loot-filter/rules.ts
    additions: 20
    deletions: 3
  - file: renderer/test/woke/filter-rules.test.ts
    additions: 12
    deletions: 1
---
> **TL;DR** Roll the game look from 182 (PR #296) out to every panel, area by area, in a few PRs. Each panel's charter leftovers get cleared in the same pass, so each panel is touched once.

After UI 2. Apply the shared game-look components to all 28 widgets, the dock cards, menus, toasts and Settings. Group into a few pull requests by area (economy, mapping, campaign and lab, builds and trade, settings), each with before and after headless shots at 1080p and 4K in the four themes.

Per panel, also clear its charter leftovers so it is touched once: sizes under 11 px (dock badge, offer chip, `ModulePage.vue:111`, price table), the 4 grey classes in `new-item/NewItemSearch.vue`.

## Order
1. Settings: nav group labels, the APT radios, checkboxes and toggles, the Refresh pill, link chips.
2. Economy: Flips verdict strip, market, analytics, boss runs, disenchant.
3. Dock cards, menus and toasts (Trades and others).
4. Mapping, campaign and lab, builds.

## Acceptance criteria
- [ ] Every panel in Hybrid and Native wears the game look with no one-off colours, edges or fonts.
- [ ] Modern and Classic unchanged apart from token-scale sizes.
- [ ] Charter leftovers listed above cleared.

## Test plan
- Local typecheck, lint, unit tests, build and e2e per PR.
- Headless shots per area in the four themes, compared with the S3 mock.
