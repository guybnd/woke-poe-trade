---
id: WOKEPOET-167
title: 'Price check: footer toggles wrap, tier gutter, Classic/Improved to Settings'
status: Done
priority: High
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:14:30.718Z'
    comment: Created ticket.
    id: a-2026-11-10t02-14-30-718z
  - type: activity
    user: Agent
    date: '2026-11-10T02:22:02.678Z'
    comment: >-
      PR #293 open, review fixes in 66ff8e65, local checks pass. Preview live on
      woke/preview-layout-defence. Waiting for cloud merge.
    id: a-2026-11-10t02-22-02-678z
  - type: comment
    user: Agent
    comment: >-
      Merged as #293 (2de8c6a6) and live on dev master. Footer toggles stay on
      one line, the tier sits next to its line, and Classic/Improved is in
      Settings > Price check > Listings.
    date: '2026-11-10T02:41:06.658Z'
    completionComment: true
    id: c-2026-11-10t02-41-06-658z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-10T02:41:06.659Z'
  - type: comment
    user: Agent
    comment: Merged as 2de8c6a6; dev runs master.
    completionComment: true
    date: '2026-11-10T02:41:09.998Z'
    id: c-2026-11-10t02-41-09-998z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-10T02:41:10.524Z'
needsAction: null
baselineCommit: e67d6ec4dad47efdb249e0afdf27705a03528309
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/293'
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
Guy's screenshot (PoE window style): Hidden filters / Item's mods labels wrap into two oversized lines and crowd the filter well; T1 tag stranded in a far-left gutter; pseudo ×N tag misaligned. Also move the Classic/Improved switch from the window to Settings > Price check.

Branch woke/pc-layout-fix (a8fec6d8). Preview: woke/preview-layout-defence (with woke/defence-mods).
