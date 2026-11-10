---
id: WOKEPOET-183
title: 'UI 3: roll the game look out panel by panel'
status: Todo
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
needsAction: null
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
