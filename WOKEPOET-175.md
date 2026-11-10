---
id: WOKEPOET-175
title: 'Declare the price check a hard fork, and give woke settings their own version'
status: Grooming
priority: Medium
effort: M
assignee: unassigned
tags:
  - overlay-core
  - docs
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-168
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:48.411Z'
    comment: Created as subtask of WOKEPOET-168.
---
Review finding B4. "APT core stays untouched" (`.docs/project-overview.md`) is no longer true: 75 upstream files modified, +4,397/−2,324 lines, 182 `woke:` markers. Biggest: `TradeListing.vue`, `Prices.ts`, `Widget.vue`, the price-check filter components. Upstream master is still at the fork point (31882089, 2026-09-25), so no conflicts yet.

Do:
1. Update the project overview: price check is a hard fork; upstream item data keeps arriving through the hourly "Upstream item data" workflow; parser fixes are merged by hand.
2. Woke's config fix-ups run unversioned after APT's migration 18 in `renderer/src/web/Config.ts`. Add a `woke.version` so woke migrations don't share upstream's `configVersion` numbers.
3. Also fix the stale "League: Allflame" line.
