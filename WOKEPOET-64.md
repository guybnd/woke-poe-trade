---
id: WOKEPOET-64
title: 'Price check: no false verdict on rares with empty searches'
status: Done
priority: Critical
effort: S
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-37
history:
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:32.285Z'
    comment: Created ticket.
    id: a-2026-11-05t08-10-32-285z
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:32.285Z'
    comment: Created as subtask of WOKEPOET-37.
    id: a-2026-11-05t08-10-32-285z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-05T08:25:32.325Z'
  - type: comment
    user: Agent
    comment: >-
      **PR #131 is reviewed, fixed and checked, and holds for Guy's answer on
      merges.** Rares now start with T1 and T2 mods ticked, and a blank search
      names no listings price. Branch claude/pc-rare-verdict is in a separate
      clone. No docs needed.
    date: '2026-11-05T08:39:53.108Z'
    completionComment: true
    id: c-2026-11-05t08-39-53-108z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-05T08:39:53.108Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:16:55.038Z'
needsAction: null
reviewState: null
---
> TL;DR: A rare with T1 mods can search with no mods ticked and read "Not worth listing". Tick T1 and T2 mods by default, and give no price or Not worth listing when a rare's search has no mods.

`create-stat-filters.ts` only ticks T1/T2 in the exact path; `PriceVerdict.vue` never checks the search. Report finding 1.
