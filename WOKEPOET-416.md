---
id: WOKEPOET-416
title: 'Bestiary: family icons and family filter chips'
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T12:13:37.130Z'
    comment: Created ticket.
    id: a-2026-11-20t12-13-37-130z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-20T12:13:38.659Z'
  - type: activity
    user: Agent
    date: '2026-11-20T12:23:34.625Z'
    comment: >-
      PR #679 open. Separate bug review clean, cloud checks green. Sent to the
      merge thread through the coordinator.
    id: a-2026-11-20t12-23-34-625z
  - type: comment
    user: Agent
    comment: >-
      Merged as #679 (4e5807e8). The dev build is on it and the family icons are
      served.
    date: '2026-11-20T12:29:44.186Z'
    completionComment: true
    id: c-2026-11-20t12-29-44-186z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-20T12:29:44.186Z'
  - type: comment
    user: Agent
    comment: >-
      Live on master as 4e5807e8 (#679): game Bestiary family icons on beast
      rows, family chips filter the list.
    completionComment: true
    date: '2026-11-20T12:29:47.701Z'
    id: c-2026-11-20t12-29-47-701z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T12:29:48.142Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/679'
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
> **TL;DR** Guy picked layout B for beast types (WOKEPOET-415) and asked for real game icons and clickable family headers that filter the list.

- Icons: game Bestiary UI family icons (Art/2DArt/UIImages/InGame/Bestiary/IconCat|Snake|Spider|Crab via poedb CDN), bundled at renderer/public/images/bestiary/*.png, 48px.
- Each row: family icon instead of the generic beast orb; group as the tag.
- Full panel: chip per family; clicking narrows the list to that family before the 12-row limit; click again shows all.
- Branch woke/beast-family, worktree E:\Git\woke\wt\beast-family.
